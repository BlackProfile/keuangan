#!/bin/bash
# Auto-restart supervisor for DompetKu dev server
# Runs in background, checks every 15s, restarts if dead

cd /home/z/my-project

LOG="/home/z/my-project/dev.log"
PIDFILE="/tmp/dompetku-dev.pid"

while true; do
  # Check if process is alive
  if [ -f "$PIDFILE" ]; then
    OLDPID=$(cat "$PIDFILE" 2>/dev/null)
    if [ -n "$OLDPID" ] && kill -0 "$OLDPID" 2>/dev/null; then
      # Process alive, check HTTP
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3000/" 2>/dev/null)
      if [ "$CODE" = "200" ] || [ "$CODE" = "000" ]; then
        # 200 = healthy, 000 = still compiling (acceptable)
        sleep 15
        continue
      fi
    fi
  fi

  # Process dead or unhealthy — kill any stale processes
  pkill -f "next dev" 2>/dev/null
  pkill -f "bun run dev" 2>/dev/null
  sleep 2

  # Clear stale cache if crash loop detected
  if [ -f "/tmp/dompetku-crash-count" ]; then
    CRASHES=$(cat /tmp/dompetku-crash-count 2>/dev/null || echo "0")
    CRASHES=$((CRASHES + 1))
    echo "$CRASHES" > /tmp/dompetku-crash-count
    if [ "$CRASHES" -gt 3 ]; then
      rm -rf /home/z/my-project/.next
      echo "0" > /tmp/dompetku-crash-count
    fi
  else
    echo "0" > /tmp/dompetku-crash-count
  fi

  # Start fresh dev server
  echo "[$(date)] Starting dev server..." >> "$LOG"
  nohup bun run dev >> "$LOG" 2>&1 &
  NEWPID=$!
  echo "$NEWPID" > "$PIDFILE"

  # Wait for it to be ready (up to 60s)
  READY=0
  for i in $(seq 1 60); do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3000/" 2>/dev/null)
    if [ "$CODE" = "200" ]; then
      READY=1
      echo "[$(date)] Server ready (HTTP 200) after ${i}s, pid=$NEWPID" >> "$LOG"
      break
    fi
    if ! kill -0 "$NEWPID" 2>/dev/null; then
      echo "[$(date)] Process died during startup after ${i}s" >> "$LOG"
      break
    fi
    sleep 1
  done

  # Wait before next check
  sleep 10
done
