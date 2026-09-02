# Start here

This is a recurring, scheduled engineering session for Beyond Social,
running 9:00-11:00 daily until the owner stops it, with the owner not
necessarily present. It is the same project the 2026-08-21 marathon session
worked (see [/docs/marathon/](../marathon/)), continued on a recurring
cadence instead of a single long session.

Read, in order, before touching anything:

1. [TEAM.md](TEAM.md) — the roles this session operates through, and the
   handoff order between them.
2. [RULES.md](RULES.md) — stricter than a normal session, because the owner
   is not one message away. What never needs the owner, and what always
   does, with no exceptions to the second list.
3. [BACKLOG.md](BACKLOG.md) — the actual work queue. The Task Manager role
   reads this first, but treats it as a starting point, not gospel: check
   the real state of the repo (open PRs, recent commits) before trusting
   what the file claims.
4. [/AGENTS.md](../../AGENTS.md) or [/CLAUDE.md](../../CLAUDE.md) — base
   engineering rules, identical content, two filenames for tooling. This
   file's `RULES.md` extends them, it does not replace them.

Also load, before touching code, the same standing references the marathon
session used:

- [/docs/ARCHITECTURE.md](../ARCHITECTURE.md) — current, self-audited.
- [/docs/ui.md](../ui.md) and [/docs/color.md](../color.md) — design source
  of truth.
- [/docs/production-readiness.md](../production-readiness.md) — re-audited
  2026-08-21, current as of that date; re-verify claims older than a few
  sessions rather than trusting the score on sight.
- [/docs/going-live.md](../going-live.md) — what is actually live in
  production versus what is built but waiting on the owner.

## How a session should run

1. Task Manager opens the session, reads the three files above, and forms
   the plan for this window.
2. Work proceeds through the roles in `TEAM.md`'s handoff order, one scoped
   unit at a time, dispatched as real subagents where the work genuinely
   parallelizes (see the Agent/Workflow patterns the marathon session used
   for research-then-build tasks).
3. Every shipped unit is committed and pushed to the one shared branch
   (`Feranmibranches`, see `RULES.md`'s "Branching" section), rolled into
   that branch's single PR, and independently re-verified, per `RULES.md`.
   The owner reviews and merges it themselves.
4. Anything hitting a rule in `RULES.md`'s "always needs the owner" list is
   logged in `BACKLOG.md` under "Needs the owner" and the session moves on.
5. Before the window ends, `BACKLOG.md` is updated to a true, current state:
   what shipped, what's in flight, what's blocked, what's next. This is the
   only memory the next scheduled session has.

## Where this differs from the 2026-08-21 marathon

- No CTO/orchestrator role narrating a fixed 3-hour arc; the Task Manager
  plans a 2-hour window and stops cleanly at the end of it, not mid-unit.
- The PR Checker role exists specifically because CI is currently blocked
  (owner-side billing issue) and cannot gate merges; it is a temporary
  substitute for CI, not a permanent alternative to it.
- Production deploys and database migrations are never performed by this
  system, full stop, not even with a prior pattern of the owner having
  approved one once. Merged code sits merged until the owner deploys it.
- A Billing/Growth Designer lens is added to the UX role, specifically for
  free-tier upgrade prompts; see `TEAM.md` for its limits.
