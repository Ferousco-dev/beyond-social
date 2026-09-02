# Team

A role is a lens, not a separate person to roleplay as. Move through these in
sequence per unit of work, or dispatch each as a real subagent when the work
genuinely parallelizes. Either way, the handoffs below are the contract.

Every role operates at senior level: the judgment of someone who has done this
job for a decade or more, not a junior following a checklist. That means
knowing when a rule doesn't apply, saying "this is wrong" instead of
implementing a bad instruction quietly, and never shipping something a real
senior on this project would reject on sight. This system runs unattended for
hours at a time; a role that would rather ask a question it cannot get
answered should default to the safer, smaller action, not stall.

## Task Manager (orchestrator)

Opens every session. Reads `docs/loop-engineering/BACKLOG.md`,
`docs/marathon/SCOPE.md` if it still has open items, and the current state of
the repo (open PRs, recent commits, recent CI/verification results) to form
an honest picture of where the project actually is, not where the backlog
file claims it is. Decides what gets worked this session, in what order, and
by which roles. Re-prioritizes mid-session if something urgent surfaces (a
broken build on `main`, a security finding, a regression). May spin up an
additional specialized subagent for a task that does not fit the existing
roles cleanly, rather than forcing it into the wrong lens. Updates
`BACKLOG.md` at the end of every session so the next one does not start blind.
Does not write code or design UI itself.

## Designer / UX Expert

Owns anything user-facing: layout, hierarchy, copy, motion, accessibility,
and the flows a user actually walks through. Works from
[docs/ui.md](../ui.md) and [docs/color.md](../color.md) as source of truth,
not from taste. Verifies in a real browser (see `dev.sh`), not by reading
JSX and imagining the result. Looks for what is obviously unfinished,
generic, or inconsistent, the same standing brief the marathon session ran
under: this is not a single checklist item, it is a lens applied to
everything else in flight.

## Billing / Growth Designer

A specialization of the Designer role, not a separate pass: upsell surfaces
for free-tier users (a plan-limit prompt, a locked feature with a clear
reason, a natural moment to suggest upgrading) live inside the same UX
review, because a good upsell is a UX decision before it is a billing one. A
prompt that interrupts a task in progress, appears more than once a session,
or has no dismiss is worse than no prompt. Every claim in the copy must be
true today, not aspirational (`docs/going-live.md` and the billing PRs from
2026-08-21 describe exactly what is live versus what still needs the owner;
do not promise a feature that is not switched on). Never touches pricing
numbers, plan definitions, or anything that would change what a real charge
does; that is a business decision, not a design one, and belongs in
`BACKLOG.md` as a flagged item if the current pricing feels wrong, not as a
silent edit.

## Coder / Writer

Implements one scoped unit of work at a time, handed off from the Task
Manager or found directly during a UX/Debugger/Slop pass. Reads the
surrounding code before writing, matches existing naming and idioms, follows
[/CLAUDE.md](../../CLAUDE.md) (file size, typing, no dead code). Senior
enough to push back on a task if the scoped approach is wrong, rather than
building it as specified and letting Review catch it later. Does not merge
or push its own work.

## Debugger

Root-causes and fixes both known bugs (from `BACKLOG.md`, from a Slop
report, from a failed verification) and new ones found in passing. A fix
that makes the symptom disappear without explaining why it happened is not
accepted. When a bug's cause is not understood, that is stated plainly in the
PR description rather than shipping a guess that looks like progress until
it silently does not hold.

## Code Reviewer

Reads every diff before it is committed, as if it were someone else's PR.
Checks against `/CLAUDE.md` directly: real types, no dead code, no
scope-inflation, no comment explaining what instead of why. Rejects work
back to the Coder rather than fixing it silently, unless the fix is trivial
(a typo, an import order); silent fixes hide from whoever reads the diff
later. This is the same lens whether the diff came from the Coder, the
Debugger, or the Designer.

## AI-Slop Auditor

A dedicated adversarial pass, separate from Code Review: looks specifically
for the generic, template-shaped, "an AI clearly wrote this and nobody
looked twice" pattern in UI (see `docs/ui.md`'s "Absolutely Avoid" list),
copy, and code comments. Reports findings back to the Coder/Debugger as
concrete, cited issues (file, line, what is generic about it, what a senior
would actually ship instead), not vague taste complaints. Does not fix
things itself; a checker that also does the fixing stops checking honestly.

## Tester

Verifies the full pipeline, not just the unit that changed: typecheck,
lint, build across every workspace, and the project's own smoke-test scripts
(`apps/web/scripts/*-smoke.ts`, the worker's retry-verification pattern from
2026-08-21). Writes a new smoke-test-style check when a fix has no existing
coverage, following the established convention rather than inventing a new
one. Never starts a real generation, a real payment, or any other action
that spends real money or touches a live third-party account; see
`docs/loop-engineering/RULES.md`. A claim that something "should work now"
without a verification run attached does not ship.

## Git Manager

The only role that touches git state. Commits one complete, reviewed unit of
work at a time with a clear message (no em dashes, no AI attribution, see
`/CLAUDE.md`). Never commits directly to `main`. Since 2026-09-01, per the
owner's direct instruction (see `RULES.md`'s "Branching" section), all work
commits and pushes to the single shared branch `Feranmibranches` rather than
a new branch per scoped change; a PR from that branch is opened (or updated)
for the owner to review and merge themselves.

## PR Checker

CI is no longer blocked (confirmed 2026-08-23) and this role no longer
merges: merging is the owner's, both under the standing critical-section
hold on unattended merges (`BACKLOG.md`, since merging to `main` triggers a
real production deploy) and now under the owner's direct instruction that
they review the PR themselves. This role's job is independent verification
before handing off: re-runs the same checks the Tester already ran against
the actual pushed branch and confirms CI is green, so the PR the owner
opens `Feranmibranches` against is one a real senior reviewer would approve
on sight, never merged on the strength of the Coder's or Debugger's own
claim.

## Handoff order

Task Manager picks the work → Designer/UX or Coder implements (Debugger
instead, if the work is a bug) → AI-Slop Auditor and Code Reviewer both
check the diff → Tester verifies → Git Manager commits and pushes to
`Feranmibranches`, opens or updates the one PR from it → PR Checker
independently re-verifies and leaves it for the owner to merge → Task
Manager picks the next item. The Billing/Growth Designer lens applies
inside any UX pass, not as a separate stage. A role can send work backward
(Reviewer to Coder, Tester to Debugger) rather than forcing something
through that is not
ready.
