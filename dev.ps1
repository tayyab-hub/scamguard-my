[CmdletBinding()]
param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local'
$pgRoot = Join-Path $localRoot 'pg17\pgsql'
$pgData = Join-Path $localRoot 'pg17-data'
$pgCtl = Join-Path $pgRoot 'bin\pg_ctl.exe'
$pgReady = Join-Path $pgRoot 'bin\pg_isready.exe'
$pgLog = Join-Path $localRoot 'postgres.log'
$python = Join-Path $projectRoot 'backend\.venv\Scripts\python.exe'
$backendEnv = Join-Path $projectRoot 'backend\.env'
$package = Join-Path $projectRoot 'frontend\package.json'
$nodeModules = Join-Path $projectRoot 'frontend\node_modules'
$runtime = Join-Path $localRoot 'dev-runtime'
$stateFile = Join-Path $runtime 'processes.json'
$backendUrl = 'http://127.0.0.1:8000'
$frontendUrl = 'http://127.0.0.1:5173'
$owned = @()
$newProcessIds = @()
$postgresStarted = $false

if (Test-Path -LiteralPath $stateFile -PathType Leaf) {
    try { $owned = @((Get-Content -Raw -LiteralPath $stateFile | ConvertFrom-Json).processes) }
    catch { $owned = @() }
}

function Assert-File([string]$Path, [string]$Message) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw $Message }
}

function Get-ListeningProcessId([int]$Port) {
    $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($connection) { return [int]$connection.OwningProcess }
    return $null
}

function Test-BackendService {
    try {
        $response = Invoke-RestMethod -Uri "$backendUrl/api/v1/health" -TimeoutSec 2
        return $response.status -eq 'ok' -and $response.service -in @('scamguard-api', 'scamguard-my-api')
    } catch { return $false }
}

function Test-FrontendService {
    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>SCAMGUARD'
    } catch { return $false }
}

function Wait-For([scriptblock]$Condition, [int]$Seconds, [string]$Failure) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        if (& $Condition) { return }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw $Failure
}

function Add-OwnedProcess([string]$Role, [int]$ProcessId) {
    $process = Get-Process -Id $ProcessId -ErrorAction Stop
    $script:owned += [pscustomobject]@{
        role = $Role
        pid = $ProcessId
        name = $process.ProcessName
        startedAt = $process.StartTime.ToUniversalTime().ToString('o')
    }
    $script:newProcessIds += $ProcessId
}

function Save-State {
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    @{ processes = @($script:owned) } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $stateFile -Encoding utf8
}

function Stop-NewProcesses {
    foreach ($record in $script:owned | Where-Object { $_.pid -in $script:newProcessIds }) {
        $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq $record.name) {
            Stop-Process -Id $record.pid -ErrorAction SilentlyContinue
        }
    }
}

try {
    Write-Host 'SCAMGUARD development startup' -ForegroundColor Cyan
    Assert-File $pgCtl 'Portable PostgreSQL is missing from .local\pg17\pgsql. See README.md setup.'
    Assert-File $pgReady 'PostgreSQL readiness tool is missing from the portable runtime.'
    if (-not (Test-Path -LiteralPath $pgData -PathType Container)) { throw 'PostgreSQL data is missing from .local\pg17-data. See README.md setup.' }
    Assert-File $python 'Backend virtual environment is missing. Create backend\.venv and install the locked dependencies.'
    Assert-File $backendEnv 'backend\.env is missing. Copy backend\.env.example, set the private local database URL, and enable persistence.'
    Assert-File $package 'frontend\package.json is missing.'
    if (-not (Test-Path -LiteralPath $nodeModules -PathType Container)) { throw 'Frontend dependencies are missing. Run npm.cmd ci in frontend.' }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm.cmd is not available on PATH.' }

    & $python -c "from app.core.config import get_settings; raise SystemExit(0 if get_settings().persistence_enabled else 2)" 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Backend persistence is not enabled or backend\.env is invalid. Set PERSISTENCE_ENABLED=true.' }

    & $pgCtl status -D $pgData *> $null
    $projectPostgresRunning = $LASTEXITCODE -eq 0
    & $pgReady -h 127.0.0.1 -p 55432 -q
    $postgresReady = $LASTEXITCODE -eq 0
    if ($postgresReady -and -not $projectPostgresRunning) {
        throw 'Port 55432 is already used by a different PostgreSQL instance. Nothing was stopped.'
    }
    if (-not $postgresReady) {
        if (Get-ListeningProcessId 55432) { throw 'Port 55432 is already in use by an unknown service. Nothing was stopped.' }
        Write-Host 'Starting the project PostgreSQL instance...'
        & $pgCtl start -D $pgData -l $pgLog -o '-h 127.0.0.1 -p 55432' -w -t 20
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start. Review .local\postgres.log.' }
        $postgresStarted = $true
        Wait-For { (& $pgReady -h 127.0.0.1 -p 55432 -q) -eq $null -and $LASTEXITCODE -eq 0 } 20 'PostgreSQL did not become ready within 20 seconds.'
    } else { Write-Host 'PostgreSQL is already ready; reusing it.' }

    Write-Host 'Applying database migrations...'
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        $savedErrorPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & $python -m alembic upgrade head 1>$null 2>$null
        $migrationExitCode = $LASTEXITCODE
        $ErrorActionPreference = $savedErrorPreference
        if ($migrationExitCode -ne 0) {
            throw 'Alembic migration failed. Confirm PostgreSQL is reachable and backend\.env contains the correct private local settings.'
        }
        Write-Host 'Database migrations are current.'
    } finally { Pop-Location }

    $backendPid = Get-ListeningProcessId 8000
    if ($backendPid) {
        if (-not (Test-BackendService)) { throw 'Port 8000 is occupied by an unknown service. Nothing was stopped.' }
        Write-Host 'Backend is already running; reusing it.'
    } else {
        Write-Host 'Starting backend in a visible terminal...'
        $helper = Join-Path $projectRoot 'scripts\dev-backend.ps1'
        $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$helper`""
        $process = Start-Process powershell.exe -ArgumentList $arguments -WindowStyle Normal -PassThru
        Add-OwnedProcess 'backend-terminal' $process.Id
        Wait-For { Test-BackendService } 30 'Backend did not become healthy within 30 seconds.'
        $listener = Get-ListeningProcessId 8000
        if ($listener -and $listener -ne $process.Id) { Add-OwnedProcess 'backend-service' $listener }
    }

    $frontendPid = Get-ListeningProcessId 5173
    $frontendStarted = $false
    if ($frontendPid) {
        if (-not (Test-FrontendService)) { throw 'Port 5173 is occupied by an unknown service. Nothing was stopped.' }
        Write-Host 'Frontend is already running; reusing it.'
    } else {
        Write-Host 'Starting frontend in a visible terminal...'
        $helper = Join-Path $projectRoot 'scripts\dev-frontend.ps1'
        $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$helper`""
        $process = Start-Process powershell.exe -ArgumentList $arguments -WindowStyle Normal -PassThru
        Add-OwnedProcess 'frontend-terminal' $process.Id
        Wait-For { Test-FrontendService } 30 'Frontend did not become ready within 30 seconds.'
        $listener = Get-ListeningProcessId 5173
        if ($listener -and $listener -ne $process.Id) { Add-OwnedProcess 'frontend-service' $listener }
        $frontendStarted = $true
    }

    if ($owned.Count) { Save-State }
    if ($frontendStarted -and -not $NoBrowser) { Start-Process $frontendUrl }
    Write-Host "Ready: $frontendUrl" -ForegroundColor Green
    Write-Host "API:   $backendUrl/api/v1/health"
    Write-Host 'Stop only launcher-owned services with Stop-SCAMGUARD.cmd or .\stop-dev.ps1.'
} catch {
    Stop-NewProcesses
    if ($postgresStarted) { & $pgCtl stop -D $pgData -m fast -w -t 20 *> $null }
    Write-Error $_.Exception.Message
    exit 1
}
