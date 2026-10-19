@echo off
rem Start agelace (Windows). Needs Docker Desktop (or Podman Desktop). Double-click to run.
rem   start-agelace.cmd --share   also reachable from a tablet on your network
setlocal
cd /d "%~dp0"
set ENGINE=docker
docker info >nul 2>&1
if not errorlevel 1 goto engine
set ENGINE=podman
podman info >nul 2>&1
if not errorlevel 1 goto engine
echo Docker isn't running. Open Docker Desktop, wait until it says it's running, then double-click this again.
pause
exit /b 1
:engine
if /i "%~1"=="--share" set AGELACE_BIND=0.0.0.0
if "%AGELACE_PORT%"=="" set AGELACE_PORT=8080
if not exist world mkdir world
if exist Dockerfile goto build
echo Fetching agelace... ^(the first start downloads it and takes a minute or two^)
%ENGINE% compose pull -q
if errorlevel 1 goto failed
%ENGINE% compose up -d
if errorlevel 1 goto failed
goto started
:build
echo Setting the type... ^(the first start builds agelace and takes a few minutes^)
%ENGINE% compose up -d --build
if errorlevel 1 goto failed
goto started
:failed
echo Something went wrong starting agelace. The message above says what.
pause
exit /b 1
:started
set /a tries=0
:wait
curl -fs http://localhost:%AGELACE_PORT%/api/health >nul 2>&1
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% gtr 60 (
  echo agelace didn't answer. Ask for help with: %ENGINE% compose logs
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait
:ready
echo agelace is open at http://localhost:%AGELACE_PORT%
start "" http://localhost:%AGELACE_PORT%
endlocal
