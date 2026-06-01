#!/bin/bash
cd "$(dirname "$0")"

# Kill any existing instance on port 3000
fuser -k 3000/tcp 2>/dev/null

# Start the server in background
npm run dev &
SERVER_PID=$!

# Wait until the server responds
echo "Starting AI Control Tower..."
until curl -s http://localhost:3000 > /dev/null 2>&1; do
  sleep 0.5
done

# Open browser
xdg-open http://localhost:3000 2>/dev/null

echo "Running at http://localhost:3000 (PID $SERVER_PID)"
echo "Press Ctrl+C to stop."

wait $SERVER_PID
