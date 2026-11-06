# Backend child-terminal command used by dev.ps1. Resolve the backend directory from this
# script, run its existing virtual environment, and propagate the server exit code.

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'SCAMGUARD Backend'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..\backend')
& '.\.venv\Scripts\python.exe' -m app
exit $LASTEXITCODE
