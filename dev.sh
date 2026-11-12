#!/usr/bin/env bash
# Starts the Go API, waits until it is healthy, then starts the web app.
# Reads server/.env and client/.env.local. Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .dev-logs

set -a; source server/.env; set +a
(cd server && go build -o app ./cmd/api)
(cd server && ./app) >.dev-logs/api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if curl -fs "http://localhost:${PORT:-8080}/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 $API_PID 2>/dev/null; then echo "The API stopped. See .dev-logs/api.log"; tail -5 .dev-logs/api.log; exit 1; fi
  sleep 1
done
echo "API ready on :${PORT:-8080}. Starting the web app on :3000 (logs: .dev-logs/)"
pnpm --filter @beyond-social/web dev
