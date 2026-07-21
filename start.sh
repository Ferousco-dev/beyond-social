#!/usr/bin/env bash
#
# One-command local start for Beyond Social.
#
# Handles first-run setup (environment files, dependency install) and then hands
# off to dev.sh, which brings the services up in a controlled, staggered way.
#
#   ./start.sh
#
# Do not use `pnpm dev` / `turbo run dev` directly at the repo root; see
# docs/DEVELOPMENT.md for why.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

info() { printf "\033[1;34m›\033[0m %s\n" "$1"; }
fail() {
  printf "\033[1;31m✗\033[0m %s\n" "$1"
  exit 1
}

# 1. Prerequisites.
command -v node >/dev/null 2>&1 || fail "Node.js 22+ is required. See https://nodejs.org"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is required. Run: corepack enable"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  fail "Node.js 22+ is required (found $(node -v)). Try: nvm use"
fi

# 2. Create local env files from the checked-in examples on first run.
for app in web worker; do
  example="apps/$app/.env.example"
  target="apps/$app/.env"
  if [ -f "$example" ] && [ ! -f "$target" ]; then
    cp "$example" "$target"
    info "Created apps/$app/.env from .env.example"
  fi
done

# 3. Install dependencies if they are missing.
if [ ! -d node_modules ]; then
  info "Installing dependencies (first run)..."
  pnpm install
fi

# 4. Start the stack. exec so Ctrl+C tears everything down cleanly.
info "Starting Beyond Social..."
exec bash "$ROOT_DIR/dev.sh"
