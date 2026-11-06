# Frontend child-terminal command used by dev.ps1. Resolve the frontend directory, launch the
# package development script and propagate its exit code.

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'SCAMGUARD Frontend'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..\frontend')
& npm.cmd run dev
exit $LASTEXITCODE
