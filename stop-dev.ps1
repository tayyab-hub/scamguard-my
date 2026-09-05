[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local'
$runtime = Join-Path $localRoot 'dev-runtime'
$stateFile = Join-Path $runtime 'processes.json'
$pgCtl = Join-Path $localRoot 'pg17\pgsql\bin\pg_ctl.exe'
$pgData = Join-Path $localRoot 'pg17-data'

Write-Host 'Stopping SCAMGUARD launcher-owned services...' -ForegroundColor Cyan
if (Test-Path -LiteralPath $stateFile -PathType Leaf) {
    try {
        $state = Get-Content -Raw -LiteralPath $stateFile | ConvertFrom-Json
        foreach ($record in @($state.processes) | Sort-Object { if ($_.role -like '*service') { 0 } else { 1 } }) {
            $process = Get-Process -Id ([int]$record.pid) -ErrorAction SilentlyContinue
            if (-not $process) { continue }
            $sameStart = $process.StartTime.ToUniversalTime().ToString('o') -eq [string]$record.startedAt
            if ($sameStart -and $process.ProcessName -eq [string]$record.name) {
                Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
                Write-Host "Stopped $($record.role)."
            } else {
                Write-Warning "Skipped PID $($record.pid) because it no longer matches the launcher record."
            }
        }
    } catch { Write-Warning 'Launcher state could not be read safely; no recorded application process was stopped.' }
    Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
} else { Write-Host 'No launcher-owned application processes were recorded.' }

if ((Test-Path -LiteralPath $pgCtl -PathType Leaf) -and (Test-Path -LiteralPath $pgData -PathType Container)) {
    & $pgCtl status -D $pgData *> $null
    if ($LASTEXITCODE -eq 0) {
        & $pgCtl stop -D $pgData -m fast -w -t 20
        if ($LASTEXITCODE -ne 0) { throw 'The project PostgreSQL instance did not stop cleanly.' }
        Write-Host 'Stopped the project PostgreSQL instance cleanly.'
    } else { Write-Host 'The project PostgreSQL instance is already stopped.' }
}
Write-Host 'SCAMGUARD development services are stopped.' -ForegroundColor Green
