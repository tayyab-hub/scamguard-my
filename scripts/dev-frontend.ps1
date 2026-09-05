$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'SCAMGUARD Frontend'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..\frontend')
& npm.cmd run dev
exit $LASTEXITCODE
