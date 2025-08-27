#!/bin/bash

echo ""
echo "========================================"
echo "  MULTI-AGENT DASHBOARD STARTUP"
echo "  Cyberpunk Glass Edition"
echo "========================================"
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port..."
        kill -9 $pid 2>/dev/null
    fi
}

# Clean up ports
echo "Cleaning up ports..."
kill_port 3000
kill_port 3001

echo ""
echo "[1/2] Starting API Server on port 3001..."
node start-api-server.js &
API_PID=$!
sleep 3

echo "[2/2] Starting React Dashboard on port 3000..."
cd dashboard && npm start &
DASHBOARD_PID=$!

echo ""
echo "========================================"
echo "  Dashboard is starting up!"
echo "========================================"
echo ""
echo "  API Server:  http://localhost:3001 (PID: $API_PID)"
echo "  Dashboard:   http://localhost:3000 (PID: $DASHBOARD_PID)"
echo ""
echo "  The browser will open automatically"
echo "  in a few seconds..."
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "========================================"
echo ""

# Trap SIGINT to kill both processes
trap "echo 'Stopping servers...'; kill $API_PID $DASHBOARD_PID; exit" INT

# Wait for processes
wait