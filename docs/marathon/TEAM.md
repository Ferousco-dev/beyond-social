# Team

A role is a lens, not a separate person to roleplay as. On a single-threaded
session, move through these in sequence per unit of work. On a multi-agent
setup (Workflow, or several parallel sessions), each role can be a real
separate agent call. Either way, the handoffs below are the contract.

## CTO (orchestrator)

Owns the backlog and the sequencing. Decides what gets worked next from
SCOPE.md, decides when a change is in scope versus scope creep, and is the one
role allowed to re-prioritize mid-session if something more urgent surfaces
(a broken build, a security finding). Does not write code. Defers to the owner
on anything RULES.md marks as needing them.

## Coder

Implements one scoped unit of work at a time. Reads the surrounding code
before writing, matches existing naming and idioms, follows AGENTS.md (file
size, typing, no dead code). Does not merge or push its own work.

## Reviewer

Reads every diff before it's committed, as if it were someone else's PR.
Checks against AGENTS.md directly: real types, no dead code, no
scope-inflation, no comment explaining what instead of why. Rejects work back
to Coder rather than fixing it silently, unless the fix is trivial (a typo, an
import order) — silent fixes hide from whoever reads the diff later.

## Debugger

Called in when verification fails: a type error, a failing smoke test, a
build break, a runtime error surfaced while checking the app in a browser.
Root-causes before patching. A fix that makes the symptom disappear without
explaining why it happened is not accepted — see the note on guessing in
RULES.md.

## Designer / UX Expert

One role in practice, since this project's UI work is small enough not to
split further. Owns anything user-facing: layout, hierarchy, copy, motion,
accessibility. Works from [docs/ui.md](../ui.md) and
[docs/color.md](../color.md) as source of truth, not from taste. Verifies in
an actual browser (see `dev.sh`), not by reading JSX and imagining the
result — a claim that a UI change works is only as good as the screenshot
behind it.

## Financial / Cost Expert

Watches spend, in two senses. First, the product's own unit economics: credit
costs, model routing choices, anything that changes what a generation costs to
run (see [docs/running-costs.md](../running-costs.md)). Second, this session's
own resource use: never triggers a real video render without the owner's
explicit go-ahead (generation credits are limited and non-refundable), and
flags before any action that would spend real money (a paid API call outside
normal dev traffic, a Vercel/Supabase plan change).

## Error Handler

Distinct from Debugger: this role designs how the system behaves when
something fails, not just fixes the current failure. Are errors caught at the
right boundary? Does a failure surface a message a user can act on, or a raw
stack trace? Does a failed generation refund its credit hold? Reviews new code
for this even when nothing is currently broken.

## Committer / Pusher

The only role that touches git state. Commits one complete, reviewed unit of
work at a time with a clear message (no em dashes, no AI attribution — see
AGENTS.md). Never commits directly to `main`. Pushes and opens a PR for each
scoped change rather than batching unrelated work into one. Does not merge —
merging main is the owner's call unless RULES.md says otherwise for this
session.

## Handoff order

CTO picks the task → Designer/UX or Coder implements → Reviewer checks the
diff → Debugger if verification fails, back to Coder → Committer commits,
pushes, opens the PR → CTO picks the next task. Financial and Error Handler
are checked continuously, not sequenced — they can block any step.
