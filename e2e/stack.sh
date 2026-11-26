#!/usr/bin/env bash
# The end-to-end test stack, all on this machine: a local Supabase, the fake
# providers (no real generation, scraping or AI), the API, and the site's
# production build. Nothing here can reach the live services or spend credits.
#
#   e2e/stack.sh up     start everything and wait until it answers
#   e2e/stack.sh down   stop everything
#
# CI runs the same script, so a pass here is a pass there.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/e2e/.state"
WEB_PORT=3100
API_PORT=8080
FAKE_PORT=8090
mkdir -p "$STATE"

wait_for() {
  local name="$1" url="$2" tries="${3:-90}"
  for _ in $(seq "$tries"); do
    if curl -fsS -o /dev/null "$url"; then
      echo "ready: $name"
      return 0
    fi
    sleep 2
  done
  echo "timed out waiting for $name at $url" >&2
  for log in "$STATE"/*.log; do echo "--- $log"; tail -40 "$log"; done >&2
  return 1
}

start_bg() {
  local name="$1"
  shift
  nohup "$@" >"$STATE/$name.log" 2>&1 &
  echo $! >"$STATE/$name.pid"
}

up() {
  supabase start --workdir "$ROOT/e2e" -x studio,imgproxy,vector,logflare,edge-runtime,supavisor,realtime
  eval "$(supabase status --workdir "$ROOT/e2e" -o env | sed 's/^/export SB_/')"

  cat >"$STATE/env" <<EOF
E2E_WEB_URL=http://127.0.0.1:$WEB_PORT
E2E_API_URL=http://127.0.0.1:$API_PORT
E2E_FAKE_URL=http://127.0.0.1:$FAKE_PORT
E2E_MAIL_URL=${SB_INBUCKET_URL:-${SB_MAILPIT_URL:-http://127.0.0.1:54324}}
E2E_SUPABASE_URL=$SB_API_URL
E2E_SERVICE_ROLE_KEY=$SB_SERVICE_ROLE_KEY
E2E_DB_URL=$SB_DB_URL
EOF

  (cd "$ROOT/server" && go build -o "$STATE/api" ./cmd/api && go build -o "$STATE/fakeproviders" ./cmd/fakeproviders)
  start_bg fake "$STATE/fakeproviders" -addr "127.0.0.1:$FAKE_PORT"
  wait_for "fake providers" "http://127.0.0.1:$FAKE_PORT/health" 30

  start_bg api env -i PATH="$PATH" HOME="$HOME" \
    APP_ENV=development PORT="$API_PORT" LOG_LEVEL=info \
    DATABASE_URL="$SB_DB_URL" \
    SUPABASE_URL="$SB_API_URL" SUPABASE_SERVICE_ROLE_KEY="$SB_SERVICE_ROLE_KEY" SUPABASE_JWT_SECRET="$SB_JWT_SECRET" \
    WEBSOCKET_ALLOWED_ORIGINS="http://127.0.0.1:$WEB_PORT" \
    ADMIN_EMAILS="admin@e2e.test" \
    APP_ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" \
    E2E_FAKE_PROVIDERS="http://127.0.0.1:$FAKE_PORT" SOCIAL_SANDBOX=true \
    KIE_API_KEY=fake APIFY_API_TOKEN=fake GEMINI_API_KEY=fake \
    "$STATE/api"
  wait_for "API" "http://127.0.0.1:$API_PORT/health" 60

  export NEXT_PUBLIC_SUPABASE_URL="$SB_API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$SB_ANON_KEY"
  export NEXT_PUBLIC_API_URL="http://127.0.0.1:$API_PORT" NEXT_PUBLIC_APP_URL="http://127.0.0.1:$WEB_PORT"
  if [ "${E2E_SKIP_BUILD:-}" != "1" ]; then
    (cd "$ROOT/client" && pnpm build)
  fi
  start_bg web env PORT="$WEB_PORT" pnpm --dir "$ROOT/client" exec next start -H 127.0.0.1 -p "$WEB_PORT"
  wait_for "site" "http://127.0.0.1:$WEB_PORT/" 60
  echo "stack is up: http://127.0.0.1:$WEB_PORT"
}

down() {
  for name in web api fake; do
    if [ -f "$STATE/$name.pid" ]; then
      kill "$(cat "$STATE/$name.pid")" 2>/dev/null || true
      rm -f "$STATE/$name.pid"
    fi
  done
  supabase stop --workdir "$ROOT/e2e" --no-backup || true
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  *) echo "usage: e2e/stack.sh up|down" >&2; exit 2 ;;
esac
