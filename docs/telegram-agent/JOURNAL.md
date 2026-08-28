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
  chat itself.
