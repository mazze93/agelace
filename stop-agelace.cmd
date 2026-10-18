@echo off
cd /d "%~dp0"
set ENGINE=docker
docker info >nul 2>&1
if errorlevel 1 set ENGINE=podman
%ENGINE% compose down
echo agelace is closed. Your world is safe in the world folder.
pause
