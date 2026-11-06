@echo off
rem Double-click wrapper: invoke dev.ps1 relative to this file, preserving paths containing spaces.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1"
if errorlevel 1 pause
