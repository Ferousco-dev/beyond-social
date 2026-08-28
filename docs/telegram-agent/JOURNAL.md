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
- **2026-08-28**: Asked (again, same day) to give the bot memory, make it
  smarter, and scope a KV migration. The memory/smarter part was already
  the previous entry's work (cross-task `JOURNAL.md` context, the
  still-running reply fix); nothing further was specific enough to act on
  without guessing at features, so no code changed there. Wrote
  `docs/telegram-agent/kv-migration-scope.md`: what a store would hold
  (task state, update-id idempotency), why it should be a Supabase table
  rather than a new KV vendor (matches this repo's existing
  PostgREST-over-HTTP pattern, no new dependency), and a phased rollout
  that ships independently and falls back to the current footer-parsing
  path at every step. No table was created and no env vars were added —
  that needs an explicit go-ahead since it's new production
  infrastructure, per the open questions at the end of that doc.
- **2026-08-28**: A "Merge all prs then I test" run was reported as ❌
  failed ("made no changes to the repository") even though Claude had
  actually merged a PR and pushed a fix to another PR's branch. Root
  cause: `telegram-claude-task.yml` treated an empty `branch_name`
  output (claude-code-action only sets it when it creates its own
  isolation branch) as proof nothing happened, when Claude can do real
  work through Bash - merging an existing PR, pushing to another PR's
  branch - without ever creating one. The actual error signal is
  `permission_denials` on the result message in claude-code-action's
  `execution_file`: added `.github/scripts/extract-permission-denials-count.sh`
  to read it, and this task's branch has the count committed and
  pushed. The matching `telegram-claude-task.yml` change (a "Count
  permission denials" step, and narrowing the "no branch" failure step
  to fire only when that count is nonzero - a clean run with zero
  denials now reports success instead, even with no PR/branch to link)
  is written but **not pushed**: same as the prior KV-migration-scope
  entry, the GitHub App token this workflow runs under has no
  `workflows` permission, so any push touching `.github/workflows/` is
  rejected. Someone with repo write access needs to apply that diff by
  hand from this branch (`git diff` against
  `claude/telegram-no-branch-false-failure` for the workflow file, or
  see this commit's PR description) before the new script has any
  effect - until then the old, overly-broad failure heuristic is still
  what runs.
