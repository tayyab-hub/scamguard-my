$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'SCAMGUARD Backend'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..\backend')
& '.\.venv\Scripts\python.exe' -m app
exit $LASTEXITCODE
