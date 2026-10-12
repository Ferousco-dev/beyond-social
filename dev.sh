#!/usr/bin/env bash
# Starts the local stack one service at a time: the Go API, then the web app.
#
# Each service is waited on before the next starts, so cold-starting compilers
# never compete for CPU and RAM. Logs go to .dev-logs/. Ctrl+C stops everything.
# Do not run `turbo run dev`: it starts every workspace at once.
set -euo pipefail
cd "$(dirname "$0")"

LOG_DIR=.dev-logs
WEB_PORT=3000
mkdir -p "$LOG_DIR"

[ -f server/.env ] || { echo "server/.env is missing. Copy server/.env.example and fill it in." >&2; exit 1; }
[ -f client/.env.local ] || { echo "client/.env.local is missing. Copy client/.env.example and fill it in." >&2; exit 1; }

# The API's port comes from its own env file.
API_PORT=$(sed -n 's/^PORT=//p' server/.env | tail -1 | tr -d '"' | tr -d "'")
API_PORT=${API_PORT:-8080}

port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
for port in "$API_PORT" "$WEB_PORT"; do
  if port_in_use "$port"; then
    echo "Port $port is already in use. Stop what is using it first (lsof -i :$port)." >&2
    exit 1
  fi
done

PIDS=()

# Stops a process and everything it started, children first.
stop_tree() {
  local pid=$1 child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do stop_tree "$child"; done
  kill -TERM "$pid" 2>/dev/null || true
}

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "Stopping..."
  local i
  for ((i = ${#PIDS[@]} - 1; i >= 0; i--)); do stop_tree "${PIDS[$i]}"; done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# wait_for NAME PID LOG TIMEOUT_SECONDS CHECK_COMMAND...
wait_for() {
  local name=$1 pid=$2 log=$3 timeout=$4
  shift 4
  local waited=0
  while ! "$@" >/dev/null 2>&1; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$name stopped while starting. Last log lines:" >&2
      tail -n 15 "$log" >&2
      exit 1
    fi
    if ((waited >= timeout)); then
      echo "$name did not become ready within ${timeout}s. See $log" >&2
      exit 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
}

# 1. Go API. Built first so a compile error shows up here, and so the running
#    process is the binary itself and not a `go run` wrapper around it.
echo "Building the API..."
(cd server && go build -o bin/api ./cmd/api)
(
  set -a
  # shellcheck disable=SC1091
  . server/.env
  set +a
  exec server/bin/api
) >"$LOG_DIR/api.log" 2>&1 &
PIDS+=($!)
echo "Starting the API on :$API_PORT (applies migrations on first start)..."
wait_for "The API" "${PIDS[0]}" "$LOG_DIR/api.log" 120 curl -fsS "http://localhost:$API_PORT/health"

# 2. Web app.
pnpm --filter @beyond-social/web dev >"$LOG_DIR/web.log" 2>&1 &
PIDS+=($!)
echo "Starting the web app on :$WEB_PORT..."
wait_for "The web app" "${PIDS[1]}" "$LOG_DIR/web.log" 120 curl -s -o /dev/null "http://localhost:$WEB_PORT"

echo
echo "Ready."
echo "  Web  http://localhost:$WEB_PORT"
echo "  API  http://localhost:$API_PORT"
echo "  Logs $LOG_DIR/api.log  $LOG_DIR/web.log"
echo "Press Ctrl+C to stop."
wait "${PIDS[@]}"
