@echo off
echo Starting Multi-Agent MCP Ensemble System Dashboard...
echo.
echo Starting API Server on port 3001...
start cmd /k "node start-api-server.js"
timeout /t 3 >nul

echo Starting React Dashboard on port 3000...
start cmd /k "cd dashboard && npm start"
timeout /t 5 >nul

echo.
echo ✅ Dashboard is starting up!
echo.
echo API Server: http://localhost:3001
echo Dashboard:  http://localhost:3000
echo.
echo The browser should open automatically in a few seconds...
echo Press any key to exit this launcher (servers will keep running).
pause >nul