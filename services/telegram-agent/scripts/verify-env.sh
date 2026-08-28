#!/usr/bin/env bash
# Validates your .env locally. Prints only PASS/FAIL for each check —
# never a secret value, and nothing here sends anything anywhere except
# the two live checks explicitly labelled below (a getMe call to
# Telegram, a repo-read call to GitHub), both using your own credentials
# against their own APIs.
#
# Usage: bash scripts/verify-env.sh [path-to-env-file]   (default: .env)
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${1:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No ${ENV_FILE} found. Copy .env.example to .env and fill it in first."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

pass=0
fail=0

check() {
  local name="$1" ok="$2"
  if [[ "$ok" == "true" ]]; then
    echo "PASS  ${name}"
    pass=$((pass + 1))
  else
    echo "FAIL  ${name}"
    fail=$((fail + 1))
  fi
}

echo "=== Format checks (no network) ==="

if [[ "${TELEGRAM_BOT_TOKEN:-}" =~ ^[0-9]+:.+$ ]]; then
  check "TELEGRAM_BOT_TOKEN looks like a real bot token" true
else
  check "TELEGRAM_BOT_TOKEN looks like a real bot token" false
fi

if [[ "${TELEGRAM_ALLOWED_USER_IDS:-}" =~ ^[0-9]+(,[0-9]+)*$ ]]; then
  check "TELEGRAM_ALLOWED_USER_IDS is numeric" true
else
  check "TELEGRAM_ALLOWED_USER_IDS is numeric" false
fi

[[ ${#TELEGRAM_WEBHOOK_SECRET} -ge 16 ]] && check "TELEGRAM_WEBHOOK_SECRET is long enough" true || check "TELEGRAM_WEBHOOK_SECRET is long enough" false
[[ ${#GITHUB_WEBHOOK_SECRET} -ge 16 ]] && check "GITHUB_WEBHOOK_SECRET is long enough" true || check "GITHUB_WEBHOOK_SECRET is long enough" false

if [[ -n "${TELEGRAM_WEBHOOK_SECRET:-}" && "${TELEGRAM_WEBHOOK_SECRET}" != "${GITHUB_WEBHOOK_SECRET:-}" ]]; then
  check "the two webhook secrets are different" true
else
  check "the two webhook secrets are different" false
fi

[[ -n "${GITHUB_TOKEN:-}" ]] && check "GITHUB_TOKEN is set" true || check "GITHUB_TOKEN is set" false
[[ "${GITHUB_OWNER:-}" == "ferousco-dev" ]] && check "GITHUB_OWNER is correct" true || check "GITHUB_OWNER is correct" false
[[ "${GITHUB_REPOSITORY:-}" == "beyond-social" ]] && check "GITHUB_REPOSITORY is correct" true || check "GITHUB_REPOSITORY is correct" false
[[ "${GITHUB_WORKFLOW_FILE:-}" == "telegram-claude-task.yml" ]] && check "GITHUB_WORKFLOW_FILE is correct" true || check "GITHUB_WORKFLOW_FILE is correct" false

echo
echo "=== Live checks (these actually call Telegram and GitHub) ==="

tmp_getme=$(mktemp)
if curl -sf "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN:-}/getMe" >"$tmp_getme" 2>/dev/null; then
  bot_username=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['result']['username'])" "$tmp_getme" 2>/dev/null || echo "?")
  check "Telegram bot token is valid (bot: @${bot_username})" true
else
  check "Telegram bot token is valid" false
fi
rm -f "$tmp_getme"

if curl -sf -H "Authorization: Bearer ${GITHUB_TOKEN:-}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${GITHUB_OWNER:-}/${GITHUB_REPOSITORY:-}" >/dev/null 2>&1; then
  check "GitHub token can read the repo" true
else
  check "GitHub token can read the repo" false
fi

echo
echo "${pass} passed, ${fail} failed"
[[ $fail -eq 0 ]]
