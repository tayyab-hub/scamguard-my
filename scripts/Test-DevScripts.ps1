$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Check([bool]$Condition, [string]$Scenario) {
    if ($Condition) { Write-Host "PASS  $Scenario" -ForegroundColor Green }
    else { $failures.Add($Scenario); Write-Host "FAIL  $Scenario" -ForegroundColor Red }
}

$tokens = $null
$parseErrors = $null
$devAst = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $root 'dev.ps1'), [ref]$tokens, [ref]$parseErrors)
Check ($parseErrors.Count -eq 0) 'dev.ps1 parses'
$tokens = $null
$parseErrors = $null
$stopAst = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $root 'stop-dev.ps1'), [ref]$tokens, [ref]$parseErrors)
Check ($parseErrors.Count -eq 0) 'stop-dev.ps1 parses'
$dev = $devAst.Extent.Text
$stop = $stopAst.Extent.Text
$startCmd = Get-Content -Raw (Join-Path $root 'Start-SCAMGUARD.cmd')
$stopCmd = Get-Content -Raw (Join-Path $root 'Stop-SCAMGUARD.cmd')
$tasks = Get-Content -Raw (Join-Path $root '.vscode\tasks.json') | ConvertFrom-Json

Check ($dev -match 'Backend virtual environment is missing') 'missing virtual environment has a preflight guard'
Check ($dev -match 'backend\\.env is missing') 'missing backend environment has a clear failure'
Check ($dev -match 'PERSISTENCE_ENABLED=true') 'disabled persistence has a clear failure'
Check ($dev -match 'Alembic migration failed' -and $dev -match 'alembic upgrade head 1>\$null 2>\$null') 'migration failure is detected without printing raw connection errors'
Check ($dev -match 'Port 8000 is occupied by an unknown service') 'unknown backend port is refused without termination'
Check ($dev -match 'Port 5173 is occupied by an unknown service') 'unknown frontend port is refused without termination'
Check ($dev -match 'Backend is already running; reusing it' -and $dev -match 'Frontend is already running; reusing it') 'repeated startup reuses known services'
Check ($dev -match 'Start-Process powershell.exe' -and $dev -match 'WindowStyle Normal') 'backend and frontend launch visibly'
Check ($dev -match 'Start-Process \$frontendUrl' -and $dev -match '\[switch\]\$NoBrowser') 'browser opening is controlled and optional'
Check ($stop -match 'startedAt' -and $stop -match 'ProcessName' -and $stop -match 'Skipped PID') 'shutdown verifies launcher ownership before stopping'
Check ($stop -match '\$pgCtl stop') 'shutdown requests a clean PostgreSQL stop'
Check ($startCmd -match '"%~dp0dev.ps1"' -and $stopCmd -match '"%~dp0stop-dev.ps1"' -and $dev -match '-File `"\$helper`"') 'double-click and child launchers use paths with spaces safely'
Check (@($tasks.tasks).Count -eq 2 -and $tasks.tasks[0].runOptions.runOn -eq 'folderOpen') 'VS Code start and stop tasks are configured'
Check ($dev -notmatch 'DATABASE_URL' -and $dev -notmatch 'pg-password') 'launcher does not read or print database secrets'

if ($failures.Count) { throw "$($failures.Count) development launcher checks failed." }
Write-Host 'All 16 development launcher checks passed.' -ForegroundColor Cyan
