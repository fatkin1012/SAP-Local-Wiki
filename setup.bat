@echo off
setlocal
pushd "%~dp0"

title SAP Playbook - Setup and Update

echo.
echo ================================
echo SAP Playbook Launcher
echo ================================
echo.
echo 1. First-time setup for new user
echo 2. Update app after developer changes
echo.

choice /C 12 /N /M "Select mode (1 or 2): "
if errorlevel 2 goto UPDATE
if errorlevel 1 goto SETUP
goto END

:SETUP
call :CHECK_NPM || goto END
echo.
echo [Setup] Installing dependencies...
call npm.cmd install || goto FAIL
echo [Setup] Building production app...
call npm.cmd run build || goto FAIL
echo [Setup] Opening app in browser...
start "" "http://localhost:3000"
echo.
echo When browser opens, click Install App to install the PWA.
echo [Setup] Starting production server...
call npm.cmd run start
goto END

:UPDATE
call :CHECK_NPM || goto END
echo.
where git >nul 2>&1
if not errorlevel 1 (
choice /C YN /N /M "Run git pull first? (Y/N): "
if errorlevel 1 (
echo [Update] Pulling latest code...
git pull
)
)

echo [Update] Installing/updating dependencies...
call npm.cmd install || goto FAIL
echo [Update] Rebuilding production app...
call npm.cmd run build || goto FAIL
echo [Update] Opening app in browser...
start "" "http://localhost:3000"
echo [Update] Starting updated production server...
call npm.cmd run start
goto END

:CHECK_NPM
where npm.cmd >nul 2>&1
if errorlevel 1 (
echo.
echo npm.cmd not found. Please install Node.js first.
pause
exit /b 1
)
exit /b 0

:FAIL
echo.
echo Command failed. Fix the error above, then run this script again.
pause
goto END

:END
popd
endlocal