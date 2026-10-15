@echo off
rem hx on the agents' PATH (PowerShell / cmd). Resolves the bundle relative to this script.
node "%~dp0..\cli\dist\hx.js" %*
