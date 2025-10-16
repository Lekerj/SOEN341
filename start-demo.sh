#!/bin/bash
# Start ConEvents in DEMO mode (macOS/Linux)
# Detects LAN IP, writes .env, starts backend & frontend, prints staff key & QR base

set -e

# Detect LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ifconfig | awk '/inet /{print $2}' | grep -v 127.0.0.1 | head -n1)
if [ -z "$LAN_IP" ]; then
  LAN_IP=$(hostname -I | awk '{print $1}')
fi
if [ -z "$LAN_IP" ]; then
  echo "Could not detect LAN IP. Defaulting to localhost."
  LAN_IP="localhost"
fi

# Write .env for demo mode
cat > backend/.env <<EOF
DEMO_MODE=1
HOST=0.0.0.0
PORT=3000
STAFF_KEY=demo-staff-key
PUBLIC_WEB_BASE=http://$LAN_IP:8080
ALLOWED_ORIGINS=http://$LAN_IP:8080,http://localhost:8080
DB_HOST=localhost
DB_USER=341
DB_PASSWORD=Pass341!
DB_NAME=convenevents
SESSION_SECRET=your_secret_key_change_in_production
EOF

echo "[INFO] .env written for DEMO mode with LAN IP: $LAN_IP"

# Start backend
echo "[INFO] Starting backend in DEMO mode..."
npm --prefix backend run start:demo &
BACKEND_PID=$!
sleep 2

# Start frontend
echo "[INFO] Starting frontend on port 8080..."
cd frontend && python3 -m http.server 8080 &
FRONTEND_PID=$!
cd ..
sleep 2

# Print staff key and QR base URL
echo "[INFO] Staff Key and QR Base URL:"
npm --prefix backend run print:config

# Wait for user to exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
