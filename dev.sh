#!/usr/bin/env bash
#
# Controlled local dev startup for the Beyond Social monorepo.
#
# Do NOT run `pnpm dev` / `turbo run dev` unfiltered at the repo root. Turbo
# launches every workspace dev server at once, and several cold-starting
# bundlers spiking together can pin CPU and RAM and freeze the machine. This
# script starts a curated set of services, staggered and one at a time, with
# per-service logs and clean teardown on Ctrl+C.
#
# Add new services to the SERVICES list below as the platform grows.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/.dev-logs"
mkdir -p "$LOG_DIR"

# Each entry: "label|pnpm workspace filter|readiness port".
# Use "-" as the port to skip the readiness wait (watchers with no server).
# Order matters: lighter services first so heavy bundlers start last.
SERVICES=(
  "worker|@beyond-social/worker|9100"
  "web|@beyond-social/web|3000"
)

PIDS=()
CLEANED=0

cleanup() {
  [ "$CLEANED" = "1" ] && return 0
  CLEANED=1
  echo ""
  echo "Shutting down dev services..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "All dev services stopped."
}
trap cleanup INT TERM EXIT

wait_ready() {
  local label="$1" port="$2" attempts=0
  [ "$port" = "-" ] && return 0
  printf "Waiting for %s on port %s" "$label" "$port"
  until nc -z localhost "$port" 2>/dev/null; do
    attempts=$((attempts + 1))
    if [ "$attempts" -gt 60 ]; then
      printf " timed out (continuing)\n"
      return 0
    fi
    printf "."
    sleep 1
  done
  printf " ready\n"
}

for entry in "${SERVICES[@]}"; do
  IFS="|" read -r label filter port <<<"$entry"
  echo "Starting $label ($filter)..."
  pnpm --filter "$filter" dev >"$LOG_DIR/$label.log" 2>&1 &
  PIDS+=("$!")
  wait_ready "$label" "$port"
done

echo ""
echo "Dev stack is up. Logs: $LOG_DIR/<service>.log"
echo "Press Ctrl+C to stop."
wait
