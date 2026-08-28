#!/usr/bin/env bash
# Posts a status update to the Telegram agent's callback endpoint.
#
# Usage: telegram-callback.sh <in_progress|success|failure|ci_success|ci_failure>
#
# The first three statuses report on a Telegram-triggered task and require
# TASK_ID for follow-up correlation. The ci_* statuses report on any other
# workflow run in this repo (see telegram-notify.yml) and have no task to
# correlate to, so TASK_ID is not required for them.
#
# Reads its payload fields from environment variables so the calling
# workflow step stays a one-liner; see telegram-claude-task.yml and
# telegram-notify.yml for what each one is set to. Never echoes
# GITHUB_WEBHOOK_SECRET or the computed signature.
set -euo pipefail

status="${1:?usage: telegram-callback.sh <in_progress|success|failure|ci_success|ci_failure>}"

: "${TELEGRAM_CALLBACK_URL:?TELEGRAM_CALLBACK_URL is required}"
: "${GITHUB_WEBHOOK_SECRET:?GITHUB_WEBHOOK_SECRET is required}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID is required}"

if [[ "$status" == "in_progress" || "$status" == "success" || "$status" == "failure" ]]; then
  : "${TASK_ID:?TASK_ID is required}"
fi

payload=$(jq -n \
  --arg task_id "${TASK_ID:-}" \
  --arg status "$status" \
  --argjson telegram_chat_id "$TELEGRAM_CHAT_ID" \
  --arg repository "${GITHUB_REPOSITORY:-}" \
  --arg branch "${BRANCH:-}" \
  --arg pr_url "${PR_URL:-}" \
  --arg commit_sha "${COMMIT_SHA:-}" \
  --arg tests "${TESTS_SUMMARY:-}" \
  --arg build "${BUILD_SUMMARY:-}" \
  --arg task_title "${TASK_TITLE:-}" \
  --arg reason "${FAILURE_REASON:-}" \
  --arg run_url "${RUN_URL:-}" \
  --arg session_id "${SESSION_ID:-}" \
  --arg reply "${REPLY:-}" \
  --arg workflow_name "${WORKFLOW_NAME:-}" \
  --arg actor "${ACTOR:-}" \
  '{
    status: $status,
    telegram_chat_id: $telegram_chat_id
  }
  + (if $task_id != "" then {task_id: $task_id} else {} end)
  + (if $repository != "" then {repository: $repository} else {} end)
  + (if $branch != "" then {branch: $branch} else {} end)
  + (if $pr_url != "" then {pr_url: $pr_url} else {} end)
  + (if $commit_sha != "" then {commit_sha: $commit_sha} else {} end)
  + (if $tests != "" then {tests: $tests} else {} end)
  + (if $build != "" then {build: $build} else {} end)
  + (if $task_title != "" then {task_title: $task_title} else {} end)
  + (if $reason != "" then {reason: $reason} else {} end)
  + (if $run_url != "" then {run_url: $run_url} else {} end)
  + (if $session_id != "" then {session_id: $session_id} else {} end)
  + (if $reply != "" then {reply: $reply} else {} end)
  + (if $workflow_name != "" then {workflow_name: $workflow_name} else {} end)
  + (if $actor != "" then {actor: $actor} else {} end)
  ')

signature=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$GITHUB_WEBHOOK_SECRET" | sed 's/^.* //')

curl --silent --show-error --fail-with-body \
  --max-time 15 \
  -X POST "$TELEGRAM_CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Callback-Signature: sha256=${signature}" \
  -d "$payload" \
  || echo "::warning::telegram callback (${status}) failed, task result was not delivered to Telegram"
