#!/usr/bin/env bash
# Posts a status update to the Telegram agent's callback endpoint.
#
# Usage: telegram-callback.sh <in_progress|success|failure|ci_success|ci_failure|pr_event>
#
# The first three statuses report on a Telegram-triggered task and require
# TASK_ID for follow-up correlation. ci_success/ci_failure report on any
# other workflow run (see telegram-notify.yml) and pr_event reports a PR
# merge/close/review (see telegram-pr-events.yml) - neither has a task to
# correlate to, so TASK_ID is not required for them.
#
# Reads its payload fields from environment variables so the calling
# workflow step stays a one-liner; see telegram-claude-task.yml,
# telegram-notify.yml, and telegram-pr-events.yml for what each one is set
# to. Never echoes GITHUB_WEBHOOK_SECRET or the computed signature.
set -euo pipefail

status="${1:?usage: telegram-callback.sh <in_progress|success|failure|ci_success|ci_failure|pr_event>}"

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
  --arg pr_event_kind "${PR_EVENT_KIND:-}" \
  --arg pr_title "${PR_TITLE:-}" \
  --arg pr_author "${PR_AUTHOR:-}" \
  --arg reviewer "${REVIEWER:-}" \
  --arg review_state "${REVIEW_STATE:-}" \
  --arg review_body "${REVIEW_BODY:-}" \
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
  + (if $pr_event_kind != "" then {pr_event_kind: $pr_event_kind} else {} end)
  + (if $pr_title != "" then {pr_title: $pr_title} else {} end)
  + (if $pr_author != "" then {pr_author: $pr_author} else {} end)
  + (if $reviewer != "" then {reviewer: $reviewer} else {} end)
  + (if $review_state != "" then {review_state: $review_state} else {} end)
  + (if $review_body != "" then {review_body: $review_body} else {} end)
  ')

signature=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$GITHUB_WEBHOOK_SECRET" | sed 's/^.* //')

curl --silent --show-error --fail-with-body \
  --max-time 15 \
  -X POST "$TELEGRAM_CALLBACK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Callback-Signature: sha256=${signature}" \
  -d "$payload" \
  || echo "::warning::telegram callback (${status}) failed, task result was not delivered to Telegram"
