@echo off
rem Start agelace (Windows). Needs Docker Desktop. Double-click to run.
rem   start-agelace.cmd --share   also reachable from a tablet on your network
setlocal
cd /d "%~dp0"
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker isn't running. Open Docker Desktop, wait until it says it's running, then double-click this again.
  pause
  exit /b 1
)
if /i "%~1"=="--share" set AGELACE_BIND=0.0.0.0
if "%AGELACE_PORT%"=="" set AGELACE_PORT=8080
echo Setting the type... ^(the first start takes a few minutes^)
docker compose up -d --build
if errorlevel 1 (
  pause
  exit /b 1
)
set /a tries=0
:wait
curl -fs http://localhost:%AGELACE_PORT%/api/health >nul 2>&1
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% gtr 60 (
  echo agelace didn't answer. Ask for help with: docker compose logs
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait
:ready
echo agelace is open at http://localhost:%AGELACE_PORT%
start "" http://localhost:%AGELACE_PORT%
endlocal
