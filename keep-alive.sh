#!/bin/bash
# DompetKu Keep-Alive Supervisor
# Restarts dev server + realtime service automatically when they die

LOG="/home/z/my-project/dev.log"
RT_LOG="/tmp/rt.log"
PID_FILE="/tmp/dompetku.pid"

cd /home/z/my-project

start_dev() {
  pkill -f "next dev" 2>/dev/null
  sleep 1
  bun run dev >> "$LOG" 2>&1 &
  echo $!
}

start_realtime() {
  pkill -f "run.js" 2>/dev/null
  sleep 1
  cd /home/z/my-project/mini-services/realtime-sync
  node run.js >> "$RT_LOG" 2>&1 &
  cd /home/z/my-project
  echo $!
}

wait_dev() {
  local pid=$1
  for i in $(seq 1 90); do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3000/" 2>/dev/null)
    if [ "$CODE" = "200" ]; then
      echo "[$(date '+%H:%M:%S')] dev ready (HTTP 200) pid=$pid" >> "$LOG"
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "[$(date '+%H:%M:%S')] dev process died during startup" >> "$LOG"
      return 1
    fi
    sleep 1
  done
  return 1
}

# Kill stale
pkill -f "next dev" 2>/dev/null
pkill -f "run.js" 2>/dev/null
sleep 2

# Start both
DEV_PID=$(start_dev)
RT_PID=$(start_realtime)
echo "$DEV_PID $RT_PID" > "$PID_FILE"
echo "[$(date '+%H:%M:%S')] supervisor started: dev=$DEV_PID realtime=$RT_PID" >> "$LOG"

wait_dev "$DEV_PID"

# Supervisor loop
while true; do
  sleep 10
  
  # Check dev server
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] dev died, restarting..." >> "$LOG"
    DEV_PID=$(start_dev)
    wait_dev "$DEV_PID"
  else
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3000/" 2>/dev/null)
    if [ "$CODE" != "200" ] && [ "$CODE" != "000" ]; then
      echo "[$(date '+%H:%M:%S')] dev unhealthy ($CODE), restarting..." >> "$LOG"
      kill "$DEV_PID" 2>/dev/null
      sleep 2
      DEV_PID=$(start_dev)
      wait_dev "$DEV_PID"
    fi
  fi
  
  # Check realtime
  if ! kill -0 "$RT_PID" 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] realtime died, restarting..." >> "$LOG"
    RT_PID=$(start_realtime)
  fi
done
