# Loop engineering rules

This system runs unattended, on a schedule, for hours at a time, with the
owner not watching and not reachable. Everything in
[/CLAUDE.md](../../CLAUDE.md) still applies. This file is stricter than
`docs/marathon/RULES.md`, not looser: a single 3-hour session had the owner
one message away the whole time. A scheduled run does not.

## Branching

Since 2026-09-01, per the owner's direct instruction: one shared branch,
`Feranmibranches`, for all work in this system. Do not cut a new branch per
task or per fix, the pattern every prior session used (see the Session log
below for the old convention). Commit and push to `Feranmibranches`
directly; open a PR from it into `main` for the owner to review. This
replaces `TEAM.md`'s "own branch per scoped change" description of the Git
Manager role; treat that file's wording as superseded by this note until it
is updated to match.

## What never needs the owner

- Reading code, writing code, committing to `Feranmibranches`, pushing it,
  opening a PR from it.
- Running the type checker, linter, build, and existing smoke tests to
  verify.
- Merging a PR, but only after the PR Checker role has independently
  re-verified it (see `TEAM.md`), never on the strength of a single role's
  own claim.
- Fixing a bug, closing a UX gap, or shipping a UI change found during this
  session's own work, the same standing discretion the 2026-08-21 marathon
  session operated under.
- Updating `docs/loop-engineering/BACKLOG.md` to reflect what actually
  happened.

## What always needs the owner, no exceptions, ever

These do not become safe because the code looks ready, because a previous
session did something similar with explicit sign-off, or because leaving
them undone blocks other work. Leaving them undone and flagging them is the
correct outcome, not a failure to route around.

- **Spending real money.** No real video generation, no real call to a
  paid third-party API outside normal, free-tier dev traffic, no billing-
  plan change, no Stripe action against a live account. If a task cannot be
  verified without spending money, verify what can be verified (typecheck,
  a local smoke test, a mocked or local-Supabase test) and say plainly what
  was not tested and why, exactly as the 2026-08-21 session's PR #103 and
  #107 did.
- **Deploying to production manually.** No `vercel deploy --prod`, no
  `supabase functions deploy` against the live project, no `supabase db
push` against the live project. Merging to `main` is allowed under the PR
  Checker's discipline above; pushing that merged code to the live app,
  the live edge functions, or the live database is a separate, owner-only
  action. Note this explicitly in `BACKLOG.md` as "merged, not deployed"
  so the owner knows exactly what is waiting for them.
- **Anything destructive or hard to reverse.** Force-push, `git reset
--hard` on a branch with real work, deleting a branch, dropping or
  altering a live database table, rewriting shared history.
- **New dependencies or new third-party services.** Confirm before adding
  anything not already in the locked stack.
- **Auth, RLS, or anything security-boundary-shaped.** Needs a second look
  from the owner even when the diff looks obviously correct; the
  2026-08-21 session's own `going-live.md` documents a real incident where
  a JWT-verification setting was silently wrong for a while.
- **Pricing, plan definitions, or anything that changes what a real charge
  does.** The Billing/Growth Designer role improves how upgrading is
  presented; it does not decide what anything costs.

If a real blocker hits one of the above, stop that thread, log it clearly
in `BACKLOG.md` under "Needs the owner", and move to the next item rather
than working around it or waiting idle for an answer that will not arrive
mid-session.

## Verification discipline

Every claim of "done" needs proof attached, not asserted: the actual
typecheck/lint/build output, the actual smoke-test pass count, or a
screenshot from the real running app for anything visual. This held all
through 2026-08-21 and does not relax because no one is watching in real
time; if anything it matters more, since there is no owner present to catch
an unverified claim before it ships.

CI is not currently a safety net (see `docs/marathon/SCOPE.md` item 1, a
GitHub Actions billing block on the owner's account, unresolved as of
2026-08-21). Until that is fixed, the PR Checker role's independent
re-verification is standing in for it. That substitution is a stated fact
of how this project runs right now, not a shortcut; the day CI comes back,
merges should require it green again, same as any other project.

## Guessing

If a bug's cause is not understood, say that plainly in the PR rather than
trying a fix and seeing if it helps. A fix without a diagnosis is a coin
flip that looks like progress until it silently does not hold.

## Cadence

One session runs 9:00-11:00 daily (self-paced within that window; ending
early when the queue is genuinely dry is fine, running long is not). Work
in complete, reviewed units, shipped as they finish, rather than batching
unrelated changes into one PR at the end of the window. A run that ships
four clean, small, reviewed PRs is a better outcome than one that ships one
giant one nobody can review.

At the end of every session, `BACKLOG.md` must read as a true record: what
shipped (with PR links), what is in flight, what is blocked and on whom,
and what is next. The next scheduled run depends on this file being honest,
since there is no continuous memory between sessions beyond what is written
down.

## No AI slop, anywhere

No em dashes, no AI or assistant attribution in any commit, PR, or code
comment, no generic filler language, in code, copy, commit messages, or PR
descriptions. This held all through 2026-08-21 and is not a per-session
preference, it is how this project is written.
