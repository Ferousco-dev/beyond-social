#!/usr/bin/env bash
# One-time interactive setup for the Telegram engineering agent.
#
# Run this on YOUR machine (not inside a Claude session) — it needs a
# browser for `vercel login` and prompts for secrets that should never be
# pasted into a chat. Nothing you type here leaves your machine except the
# actual API calls to Vercel/Telegram it makes on your behalf.
#
# What it does:
#   1. Confirms the vercel CLI is installed and you're logged in
#   2. Prompts for the 8 Vercel environment variables (secrets hidden)
#   3. Deploys once (so the project exists), adds the env vars, redeploys
#      (env vars only apply to the deployment made after they're added)
#   4. Registers the Telegram webhook against the final deployed URL
#   5. Prints the 3 values you still need to paste into GitHub's secrets UI
#
# Usage: bash scripts/setup.sh   (run from services/telegram-agent/)
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI not found. Install it first:"
  echo "  npm install -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Not logged in to Vercel. Opening login..."
  vercel login
fi

echo
echo "=== Telegram values ==="
read -rp "TELEGRAM_BOT_TOKEN (from BotFather): " TELEGRAM_BOT_TOKEN
read -rp "TELEGRAM_ALLOWED_USER_IDS (your numeric Telegram id): " TELEGRAM_ALLOWED_USER_IDS
read -rsp "TELEGRAM_WEBHOOK_SECRET (the random string you generated): " TELEGRAM_WEBHOOK_SECRET
echo
echo
echo "=== GitHub values ==="
read -rsp "GITHUB_TOKEN (fine-grained PAT): " GITHUB_TOKEN
echo
read -rsp "GITHUB_WEBHOOK_SECRET (the other random string, same one you'll put in GitHub secrets): " GITHUB_WEBHOOK_SECRET
echo
echo

GITHUB_OWNER="ferousco-dev"
GITHUB_REPOSITORY="beyond-social"
GITHUB_WORKFLOW_FILE="telegram-claude-task.yml"

echo "=== Step 1/4: linking + first deploy (creates the Vercel project) ==="
vercel deploy --yes 2>&1 | tee /tmp/telegram-agent-deploy1.log
FIRST_URL=$(tail -1 /tmp/telegram-agent-deploy1.log)
echo "First deploy: ${FIRST_URL}"

echo
echo "=== Step 2/4: setting environment variables ==="
add_env() {
  local name="$1" value="$2"
  printf '%s' "$value" | vercel env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$name" production
}
add_env TELEGRAM_BOT_TOKEN "$TELEGRAM_BOT_TOKEN"
add_env TELEGRAM_ALLOWED_USER_IDS "$TELEGRAM_ALLOWED_USER_IDS"
add_env TELEGRAM_WEBHOOK_SECRET "$TELEGRAM_WEBHOOK_SECRET"
add_env GITHUB_TOKEN "$GITHUB_TOKEN"
add_env GITHUB_OWNER "$GITHUB_OWNER"
add_env GITHUB_REPOSITORY "$GITHUB_REPOSITORY"
add_env GITHUB_WORKFLOW_FILE "$GITHUB_WORKFLOW_FILE"
add_env GITHUB_WEBHOOK_SECRET "$GITHUB_WEBHOOK_SECRET"

echo
echo "=== Step 3/4: redeploying to production (env vars apply from here) ==="
vercel deploy --prod --yes 2>&1 | tee /tmp/telegram-agent-deploy2.log
PROD_URL=$(tail -1 /tmp/telegram-agent-deploy2.log)
echo "Production URL: ${PROD_URL}"

echo
echo "=== Step 4/4: verifying health, then registering the Telegram webhook ==="
curl -sf "${PROD_URL}/api/health" && echo
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${PROD_URL}/api/telegram/webhook\", \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\"}"
echo
echo

cat <<EOF
=================================================================
Done on the Vercel side. Two things left, both in GitHub:

repo -> Settings -> Secrets and variables -> Actions -> New repository secret

  CLAUDE_CODE_OAUTH_TOKEN = <output of 'claude setup-token'>
  TELEGRAM_CALLBACK_URL   = ${PROD_URL}/api/github/callback
  GITHUB_WEBHOOK_SECRET   = <the same value you just entered above>

Then message your bot on Telegram and try a real task.
=================================================================
EOF
