# Telegram-triggered task journal

A running log of substantive changes made through the Telegram engineering
bot (see `services/telegram-agent/`). Every task runs in a fresh Claude
Code session with no memory of any earlier one — this file is the only
thing that carries context forward between separate tasks, the same role
`docs/loop-engineering/BACKLOG.md` plays for the scheduled loop-engineering
sessions.

Claude appends one entry here as part of the same commit whenever a task
changes the repository. A task that doesn't change anything still gets a
short entry if it settled something a future task would need to know
(a clarified requirement, a decision, a constraint ruled out) — later
sessions have no access to the Telegram chat itself, only this file, so
that context would otherwise be lost for good. A task that was purely
informational and produced no lasting decision (a one-off "what does X
do") gets no entry.

Newest entries at the bottom. Keep each entry to a couple of lines: what
was asked, what changed or was decided, and why if it's not obvious.

## Log

- **2026-08-28**: Asked to delete unused branches and start using this
  journal. Deleted 55 remote branches whose PRs were already merged into
  main (no unique work lost). Left `redesign/landing-hero` alone: it has
  no PR and ~20 commits not on main (hero redesign, new model
  integrations, avatar/download work) that would be lost for good.
- **2026-08-28**: Asked to make the bot "smarter" around memory and
  replying. Found the "Claude is working…" status message carried no task
  footer, so replying to it while a task was still running silently
  dispatched an unrelated task instead of following up (there's no
  session to resume until the run finishes anyway) — it now carries a
  footer, and that reply case gets an honest "still running, try again
  once it finishes" instead. Also broadened this journal's own logging
  rule: previously only repo-changing tasks got an entry; now a task that
  settles a decision or constraint with no code change also gets one,
  since a fresh session only ever sees this file, never the Telegram
  chat itself. Note: the matching prompt text in
  `.github/workflows/telegram-claude-task.yml` (the actual instruction a
  future session reads, not just this file's header) could **not** be
  updated by this task — the GitHub App token this workflow runs under
  has no `workflows` permission, so pushes touching files under
  `.github/workflows/` are rejected. That file still has the old, narrower
  wording until someone with repo write access applies it by hand; until
  then, treat this file's broadened rule as the source of truth.
- **2026-08-28**: Asked to start the Supabase table for the bot's memory.
  Added `supabase/migrations/0076_bot_memory.sql`: a `bot_memory` table
  (`task_id`, `summary`, `created_at`), RLS enabled with no policies
  (service-role only, same as `mail_deliveries`), and an append-only trigger
  like `admin_audit_log`'s so no row can be edited or deleted once written.
  Verified against a local stack: the migration applies, the check
  constraints and immutability trigger reject bad input, and
  `authenticated`/`anon` cannot read it. This is only the table; nothing in
  `services/telegram-agent` writes to or reads from it yet, and JOURNAL.md
  remains the source of truth for cross-task memory until a future task
  wires the bot up to it (new Supabase env vars in Vercel, a Supabase
  client in `lib/`, and a decision on whether it replaces or supplements
  this file).
