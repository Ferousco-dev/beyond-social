# Backlog

Live work queue for the recurring loop-engineering sessions. The Task
Manager role updates this at the start and end of every session; treat
anything older than a few days with suspicion and re-verify against the
real repo state before acting on it.

Seeded 2026-08-22, right after the 2026-08-21 marathon session (17+ PRs
merged that day, `docs/marathon/SCOPE.md` has the full record).

## Needs the owner (do not start until unblocked)

- **Vercel production deploy.** Everything merged through 2026-08-21 is on
  `main` but not yet live. Owner runs `cd apps/web && vercel deploy --prod
  --yes --archive=tgz` themselves; this system does not deploy.
- **kie.ai account balance.** Confirmed root cause of "videos not
  generating": the render provider's own account balance ran too low.
  Needs a real top-up.
- **GitHub Actions billing.** CI's `Verify` job fails instantly on every
  run, account-side. Until fixed, the PR Checker role stands in (see
  `RULES.md`).
- **Credit pack pricing.** The one-time top-up purchase backend is built
  and tested; needs the owner to decide real prices before the checkout
  button can be wired up.
- **Live Stripe credentials.** Subscription checkout is fully built and
  tested; needs real `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/
  `STRIPE_PRICE_*` values to accept real payments.

## Open, safe to work

- **Observability.** No error tracking or APM anywhere in the app
  (confirmed by the 2026-08-21 production-readiness re-audit, PR #98). The
  single largest remaining gap on that audit. Adding one likely needs a new
  dependency (Sentry or similar), which needs the owner's confirmation
  first per `RULES.md`; flag it and ask rather than adding it silently.
- **Rate limiting.** Not yet distributed (would need Upstash or similar,
  same new-dependency caveat as above).
- **CSP nonce, webhook secret in a header instead of a query string,
  response caching/pagination on a couple of endpoints, storage lifecycle
  rules, end-to-end test coverage.** All from the same re-audit
  (`docs/production-readiness.md`), all smaller than the two above, all
  worth picking off individually.
- **`regenerateGeneration` swallows the real error message**, same pattern
  already fixed elsewhere in `apps/web/src/lib/chat/turn.ts`,
  `features/generation/actions.ts`, and `avatar-actions.ts` on
  2026-08-21 (PR #119). Found and explicitly flagged as out of scope for
  that PR; same fix, same `edgeFunctionErrorMessage` helper already exists
  to reuse.
- **Brief flow and script flow are two separate systems** that could
  eventually be unified (typed-idea path vs. TikTok-reference path). Not a
  bug, just duplication. Worth a design pass before touching, not a quick
  refactor.
- **Circuit breaker for AI provider calls is per-process, not shared.**
  Reviewed 2026-08-21, still an acceptable trade at current traffic.
  Revisit once real usage data exists, not on a timer.
- **UI/UX standing pass.** No specific ticket, this is the Designer role's
  default work when nothing else is queued: walk the real app, find what
  looks unfinished or generic, fix it. The 2026-08-21 session did a first
  pass and found the app already at a high bar; this is genuinely
  open-ended, not a sign anything is broken.
- **Billing/growth upsell surfaces.** Not started. First real task for the
  Billing/Growth Designer role: find natural, honest moments to prompt a
  free-tier user toward upgrading (a plan limit hit, a locked feature),
  matching `docs/ui.md`'s restraint-over-decoration standard. Every claim
  in the copy must describe something actually live today.

## In flight

Nothing yet. This section fills in mid-session and should be empty at the
start of a fresh run; if it is not, the previous session ended mid-unit and
that needs investigating before starting new work.

## Session log

- **2026-08-22, setup.** This file created alongside `TEAM.md`, `RULES.md`,
  `START_HERE.md`. No engineering session run yet under this system.
