#!/usr/bin/env bash
# Counts how many tool calls Claude's run had auto-denied, from
# claude-code-action's `execution_file` output. Used to tell a real
# permission-blocked failure apart from a run that legitimately created no
# isolation branch (merged an existing PR, pushed to an existing branch,
# answered a question) - see telegram-claude-task.yml's "no branch" step.
#
# Never fails the calling step: a missing file, an unreadable file, or a
# shape that doesn't match all print "0", so an unparsable file
# conservatively reads as "no denials" rather than blocking a valid success
# report.
#
# Usage: extract-permission-denials-count.sh <execution_file>
set -uo pipefail

file="${1:-}"
if [[ -z "$file" || ! -r "$file" ]]; then
  echo 0
  exit 0
fi

count=$(jq -s -r '
  (if (length == 1 and (.[0] | type) == "array") then .[0] else . end)
  | map(select(.type == "result"))
  | last // {}
  | (.permission_denials // []) | length
' "$file" 2>/dev/null)

echo "${count:-0}"
exit 0
