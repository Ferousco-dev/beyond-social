#!/usr/bin/env bash
# Best-effort extraction of Claude's final reply text from
# claude-code-action's `execution_file` output, so it can be forwarded to
# Telegram instead of just a canned status line.
#
# execution_file's exact shape isn't documented upstream, so this handles
# both plausible forms: a JSONL transcript (one message object per line)
# and a single JSON array of messages. Never fails the calling step —
# an empty result just means no "Reply:" line gets added later.
#
# Usage: extract-claude-reply.sh <execution_file>
set -uo pipefail

file="${1:-}"
[[ -n "$file" && -r "$file" ]] || exit 0

jq -s -r '
  (if (length == 1 and (.[0] | type) == "array") then .[0] else . end)
  | map(select(.type == "assistant"))
  | last // empty
  | (.message.content // [])[]?
  | select(.type == "text")
  | .text
' "$file" 2>/dev/null | head -c 3000

exit 0
