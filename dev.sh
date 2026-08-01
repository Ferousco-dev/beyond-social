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
# It also brings up what the apps depend on, because a dev server started
# against a database that is not running fails in a way that looks like a code
# problem.
#
#   ./dev.sh              everything
#   ./dev.sh web admin    only those services
#   ./dev.sh --no-infra   skip Docker, Supabase and Redis (already running)

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
  "mail|@beyond-social/mail|9200"
  "admin|@beyond-social/admin|3001"
  "web|@beyond-social/web|3000"
)

START_INFRA=1
WANTED=()
for arg in "$@"; do
  case "$arg" in
    --no-infra) START_INFRA=0 ;;
    -h|--help) sed -n '3,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) WANTED+=("$arg") ;;
  esac
done

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
  # Supabase and Redis are left running on purpose: they are slow to start and
  # keeping state between runs is the point. Stop them with `supabase stop`.
  echo "All dev services stopped. Supabase and Redis are still up."
}
trap cleanup INT TERM EXIT

step() { printf "\n\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[32mok\033[0m    %s\n" "$1"; }
warn() { printf "  \033[33mwarn\033[0m  %s\n" "$1"; }
die()  { printf "  \033[31mfail\033[0m  %s\n" "$1"; exit 1; }

wait_ready() {
  local label="$1" port="$2" attempts=0
  [ "$port" = "-" ] && return 0
  printf "  waiting for %s on :%s" "$label" "$port"
  until nc -z localhost "$port" 2>/dev/null; do
    attempts=$((attempts + 1))
    if [ "$attempts" -gt 90 ]; then
      printf " timed out, see %s/%s.log\n" "$LOG_DIR" "$label"
      return 0
    fi
    printf "."
    sleep 1
  done
  printf " ready\n"
}

# ---------------------------------------------------------------------------
# Infrastructure: everything underneath the apps.
# ---------------------------------------------------------------------------
if [ "$START_INFRA" = "1" ]; then
  step "Infrastructure"

  if ! docker info >/dev/null 2>&1; then
    # Started explicitly rather than automatically: bringing up a virtual
    # machine is a decision the person running this should make knowingly.
    if command -v colima >/dev/null 2>&1; then
      # `colima start` on a stale socket prints "already running, ignoring" and
      # changes nothing, because the VM genuinely is running: it is the daemon
      # inside it that died, usually after the laptop slept. Telling someone to
      # start what is already started sends them in a circle, so distinguish the
      # two states and name the command that actually helps.
      if colima status >/dev/null 2>&1; then
        die "Colima is running but its Docker daemon is not answering, which is a stale socket after a sleep. Fix it with: colima restart"
      fi
      die "Docker is not running. Start it with: colima start"
    fi
    die "Docker is not running. Start Docker Desktop, or install colima."
  fi
  ok "docker is running"

  command -v supabase >/dev/null 2>&1 \
    || die "Supabase CLI missing. Install with: brew install supabase/tap/supabase"

  if supabase status >/dev/null 2>&1; then
    ok "supabase is already up"
  else
    printf "  starting supabase (the first run pulls images and takes a while)"
    supabase start >"$LOG_DIR/supabase.log" 2>&1 \
      || die "supabase failed to start, see $LOG_DIR/supabase.log"
    printf " ready\n"
  fi

  # Applied every run: a migration added since the last start would otherwise
  # surface as a schema error at request time rather than here.
  if supabase migration up >"$LOG_DIR/migrations.log" 2>&1; then
    ok "migrations applied ($(ls supabase/migrations/*.sql | wc -l | tr -d ' ') files)"
  else
    warn "migrations did not apply cleanly, see $LOG_DIR/migrations.log"
  fi

  # Three ways to get Redis, cheapest first. BullMQ requires `noeviction`, so
  # every path sets it: an evicting Redis silently drops queued jobs, which
  # looks like publishing that mysteriously never happened.
  if nc -z localhost 6379 2>/dev/null; then
    ok "redis is already up"
  elif command -v redis-server >/dev/null 2>&1; then
    redis-server --port 6379 --maxmemory 256mb --maxmemory-policy noeviction \
      --daemonize yes >"$LOG_DIR/redis.log" 2>&1 && ok "redis started (native)" \
      || warn "redis did not start, so the worker and mail queues stay idle"
  elif docker compose version >/dev/null 2>&1; then
    docker compose up -d >"$LOG_DIR/redis.log" 2>&1 && ok "redis started (compose)" \
      || warn "redis did not start, so the worker and mail queues stay idle"
  else
    # The brew `docker` CLI ships without the compose plugin, which is why the
    # compose path above cannot be assumed.
    docker run -d --name beyond-redis -p 6379:6379 redis:7-alpine \
      redis-server --maxmemory 256mb --maxmemory-policy noeviction \
      >"$LOG_DIR/redis.log" 2>&1 && ok "redis started (docker)" \
      || warn "redis did not start, so the worker and mail queues stay idle"
  fi
fi

# ---------------------------------------------------------------------------
# Which database is the app actually pointed at?
#
# This script starts a local Supabase and applies every migration to it, then
# launches an app that reads its own env and may be talking to production
# instead. Three things can disagree: the URL, the anon key and the service-role
# key, and a mismatch does not fail loudly. It surfaces as something else
# entirely: a service-role key from the wrong project made the rate limiter fail
# closed, and the sign-in page reported "too many attempts" for a limiter that
# had never counted anything.
# ---------------------------------------------------------------------------
step "Configuration"

WEB_ENV=""
for candidate in apps/web/.env.local apps/web/.env; do
  [ -f "$candidate" ] && WEB_ENV="$candidate" && break
done

if [ -z "$WEB_ENV" ]; then
  warn "the web app has no env file, so it will run unconfigured"
else
  APP_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$WEB_ENV" | tail -1 | cut -d= -f2- | tr -d '"' || true)
  APP_SERVICE=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$WEB_ENV" | tail -1 | cut -d= -f2- | tr -d '"' || true)

  case "$APP_URL" in
    *127.0.0.1*|*localhost*)
      ok "web points at the local stack ($WEB_ENV)"
      # The local stack issues `sb_secret_` keys. A JWT here is the hosted
      # project's, and every service-role call will be rejected.
      case "$APP_SERVICE" in
        sb_secret_*) ok "service-role key matches the local stack" ;;
        "") warn "SUPABASE_SERVICE_ROLE_KEY is empty, so anything needing it will fail" ;;
        *) die "SUPABASE_SERVICE_ROLE_KEY in $WEB_ENV is not this stack's key. Local Supabase issues an sb_secret_ key; a JWT belongs to the hosted project and will be rejected, which shows up as rate limits and permission errors rather than as a config error. Get the right one with: supabase status -o env | grep SECRET_KEY" ;;
      esac
      ;;
    "")
      warn "NEXT_PUBLIC_SUPABASE_URL is unset in $WEB_ENV"
      ;;
    *)
      # Not an error. Pointing at the hosted project is a legitimate choice, but
      # it should never be an accident, so it is stated every time.
      warn "web points at a REMOTE Supabase, not the local stack you just started:"
      warn "  $APP_URL"
      warn "  local migrations and local accounts will not apply. Override in apps/web/.env.local."
      ;;
  esac
fi

# The worker was never checked, only the web app, and it is the one that matters
# more: it runs with a service-role key and its publishing queue posts to real
# social accounts. Pointed at the hosted project it will happily claim a due
# post and publish it from a laptop mid-edit. Loud, and refuses to be silent
# about it, because nothing else in the stack would tell you.
if [ -f apps/worker/.env ]; then
  WORKER_URL=$(grep -E '^SUPABASE_URL=' apps/worker/.env | tail -1 | cut -d= -f2- | tr -d '"' || true)
  case "$WORKER_URL" in
    *127.0.0.1*|*localhost*) ok "worker points at the local stack" ;;
    "") warn "SUPABASE_URL is unset in apps/worker/.env, so the worker will idle" ;;
    *)
      warn "worker points at a REMOTE Supabase:"
      warn "  $WORKER_URL"
      warn "  its publishing queue can publish real scheduled posts to real accounts"
      warn "  from this machine. Point apps/worker/.env at the local stack unless"
      warn "  you deliberately mean to operate on production data."
      ;;
  esac
fi

# ---------------------------------------------------------------------------
# Application services.
# ---------------------------------------------------------------------------
step "Services"
for entry in "${SERVICES[@]}"; do
  IFS="|" read -r label filter port <<<"$entry"

  # With arguments, run only what was asked for.
  if [ "${#WANTED[@]}" -gt 0 ]; then
    match=0
    for want in "${WANTED[@]}"; do [ "$want" = "$label" ] && match=1; done
    [ "$match" = "1" ] || continue
  fi

  if nc -z localhost "$port" 2>/dev/null; then
    warn "$label already running on :$port, leaving it alone"
    continue
  fi

  printf "  starting %s\n" "$label"
  pnpm --filter "$filter" dev >"$LOG_DIR/$label.log" 2>&1 &
  PIDS+=("$!")
  wait_ready "$label" "$port"
done

step "Ready"
cat <<'SUMMARY'
  User app         http://localhost:3000
  Admin console    http://localhost:3001
  Supabase Studio  http://127.0.0.1:54323
  Mailpit (email)  http://127.0.0.1:54324

  Logs             .dev-logs/<service>.log
  Stop             Ctrl+C here, then `supabase stop` for the database
SUMMARY
echo ""
wait
