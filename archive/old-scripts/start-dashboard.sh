#!/bin/bash

echo "Starting Multi-Agent MCP Ensemble System Dashboard..."
echo ""
echo "Starting API Server on port 3001..."
node start-api-server.js &
API_PID=$!
sleep 3

echo "Starting React Dashboard on port 3000..."
cd dashboard && npm start &
DASHBOARD_PID=$!

echo ""
echo "✅ Dashboard is starting up!"
echo ""
echo "API Server: http://localhost:3001 (PID: $API_PID)"
echo "Dashboard:  http://localhost:3000 (PID: $DASHBOARD_PID)"
echo ""
echo "The browser should open automatically in a few seconds..."
echo "Press Ctrl+C to stop both servers"

# Trap SIGINT to kill both processes
trap "echo 'Stopping servers...'; kill $API_PID $DASHBOARD_PID; exit" INT

# Wait for processes
wait