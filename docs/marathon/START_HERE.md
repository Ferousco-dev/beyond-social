# Start here

You're picking up Beyond Social for a 3-hour autonomous work session (a
"marathon"). This isn't a fresh project — read before acting:

1. [TEAM.md](TEAM.md) — the roles you're operating as and how they hand off to
   each other.
2. [RULES.md](RULES.md) — how this session runs differently from a normal one:
   autonomy boundaries, cadence, what needs the owner and what doesn't.
3. [SCOPE.md](SCOPE.md) — the actual backlog for these 3 hours, prioritized.
4. [/AGENTS.md](../../AGENTS.md) and [/CLAUDE.md](../../CLAUDE.md) — the base
   engineering rules. Identical content, two filenames for tooling
   compatibility. RULES.md extends these for the marathon; it does not replace
   them.

Also load, before touching code:

- [/docs/ARCHITECTURE.md](../ARCHITECTURE.md) — current, actively maintained,
  self-audited. Trust this over production-readiness.md where they disagree.
- [/docs/production-readiness.md](../production-readiness.md) — **stale**,
  dated 2026-07-26 against `feature/backend-integration`, before most of what
  now exists (CI, tracing, rate limiting, circuit breakers). Its diagnosis of
  what's missing is out of date; do not act on it without re-verifying against
  current `main` first. SCOPE.md's first task is re-auditing it.

## Where the last session left off

- Branch `main` is clean and up to date; the prompt knowledge base sits at
  1078 chunks (merged as PR #94).
- Production (`beyond-social-rust.vercel.app`) was manually redeployed once
  this session via `vercel deploy --prod --yes --archive=tgz`, because CI's
  auto-deploy-on-merge is wired but every CI run fails before `Verify` even
  starts, due to a GitHub Actions billing issue on the account (see SCOPE.md,
  item 1 — this needs the owner, and is not a missing secret).
- No generation credits were spent testing video output this session; the
  standing rule (never start a test render without asking) still applies.
