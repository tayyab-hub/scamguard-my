@echo off
rem Double-click wrapper: invoke the ownership-aware stop script relative to this file.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-dev.ps1"
if errorlevel 1 pause
