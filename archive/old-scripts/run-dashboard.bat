@echo off
echo.
echo ========================================
echo   MULTI-AGENT DASHBOARD STARTUP
echo   Cyberpunk Glass Edition
echo ========================================
echo.

REM Kill any existing processes on ports 3000 and 3001
echo Cleaning up ports...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [1/2] Starting API Server on port 3001...
start /B cmd /c "node start-api-server.js"
timeout /t 3 >nul

echo [2/2] Starting React Dashboard on port 3000...
cd dashboard
start /B cmd /c "npm start"

echo.
echo ========================================
echo   Dashboard is starting up!
echo ========================================
echo.
echo   API Server:  http://localhost:3001
echo   Dashboard:   http://localhost:3000
echo.
echo   The browser will open automatically
echo   in a few seconds...
echo.
echo   Press Ctrl+C to stop both servers
echo ========================================
echo.

pause