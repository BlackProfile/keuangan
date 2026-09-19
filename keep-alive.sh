#!/bin/bash
# DompetKu Server Keep-Alive Supervisor
# Checks every 10s, restarts if server is down

LOG="/home/z/my-project/dev.log"
PIDFILE="/tmp/dompetku-dev.pid"
CRASH_FILE="/tmp/dompetku-crashes"

cd /home/z/my-project

# Kill any existing next processes
pkill -f "next dev" 2>/dev/null
sleep 1

start_server() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting dev server..." >> "$LOG"
  nohup bun run dev >> "$LOG" 2>&1 &
  local pid=$!
  echo "$pid" > "$PIDFILE"
  
  # Wait for ready (up to 90s)
  for i in $(seq 1 90); do
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3000/" 2>/dev/null)
    if [ "$code" = "200" ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server ready (HTTP 200) after ${i}s, pid=$pid" >> "$LOG"
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Process died during startup after ${i}s" >> "$LOG"
      return 1
    fi
    sleep 1
  done
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Timeout waiting for server" >> "$LOG"
  return 1
}

# Initial start
start_server

# Supervisor loop — runs forever, checks every 10s
while true; do
  sleep 10
  
  # Check if process is alive
  PID=$(cat "$PIDFILE" 2>/dev/null)
  if [ -z "$PID" ] || ! kill -0 "$PID" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Process dead, restarting..." >> "$LOG"
    
    # Crash count for cache clearing
    CRASHES=$(cat "$CRASH_FILE" 2>/dev/null || echo "0")
    CRASHES=$((CRASHES + 1))
    echo "$CRASHES" > "$CRASH_FILE"
    if [ "$CRASHES" -ge 3 ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] 3+ crashes, clearing .next cache" >> "$LOG"
      rm -rf /home/z/my-project/.next
      echo "0" > "$CRASH_FILE"
    fi
    
    pkill -f "next dev" 2>/dev/null
    sleep 2
    start_server
  else
    # Process alive, check HTTP health
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3000/" 2>/dev/null)
    if [ "$CODE" = "000" ]; then
      # Maybe still compiling, check again in a bit
      sleep 5
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3000/" 2>/dev/null)
    fi
    if [ "$CODE" != "200" ] && [ "$CODE" != "000" ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Unhealthy (HTTP=$CODE), restarting..." >> "$LOG"
      kill "$PID" 2>/dev/null
      sleep 2
      start_server
    else
      # Healthy — reset crash count
      echo "0" > "$CRASH_FILE"
    fi
  fi
done
