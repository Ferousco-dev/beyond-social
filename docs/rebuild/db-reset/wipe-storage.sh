#!/usr/bin/env bash
# DESTRUCTIVE. Empties and deletes every storage bucket in the project, through
# the Storage API (SQL deletes on storage.objects are blocked by Supabase).
# Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
set -euo pipefail
: "${SUPABASE_URL:?}" "${SUPABASE_SERVICE_ROLE_KEY:?}"
api="${SUPABASE_URL%/}/storage/v1"
auth=(-H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")

ids=$(curl -fsS "${auth[@]}" "$api/bucket" | python3 -c 'import json,sys; print("\n".join(b["id"] for b in json.load(sys.stdin)))')
for id in $ids; do
  echo "emptying and deleting bucket: $id"
  curl -fsS -X POST "${auth[@]}" "$api/bucket/$id/empty" >/dev/null
  curl -fsS -X DELETE "${auth[@]}" "$api/bucket/$id" >/dev/null
done
echo "done: $(curl -fsS "${auth[@]}" "$api/bucket" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))') buckets left"
