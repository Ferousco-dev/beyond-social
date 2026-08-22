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
- **kie-callback webhook secret in a query string.**
  `supabase/functions/kie-callback/index.ts` carries a shared secret in
  the callback URL's query string rather than a header. Investigated
  2026-08-22: kie.ai's callback API only accepts a `callBackUrl` string,
  with no mechanism to attach custom headers, so the query-string secret
  is likely the only delivery mechanism kie.ai actually supports. This is
  also an auth/security-boundary change per `RULES.md`, which needs a
  second look from the owner even when a diff looks correct. Owner should
  either confirm the current approach is acceptable, or point to concrete
  evidence that kie.ai supports header-based webhook auth.
- **Storage lifecycle rules (retention policy).** Supabase Storage has no
  built-in object TTL; a real fix means a new scheduled job that deletes
  objects past some age, and how long to keep avatars, generated videos,
  and uploads before deleting them is a product decision, not an
  engineering one. Also destructive (deletes real user files) per
  `RULES.md`. Needs the owner to set the actual retention windows before
  any code gets written here.

## Open, safe to work

- **Observability.** No error tracking or APM anywhere in the app
  (confirmed by the 2026-08-21 production-readiness re-audit, PR #98). The
  single largest remaining gap on that audit. Adding one likely needs a new
  dependency (Sentry or similar), which needs the owner's confirmation
  first per `RULES.md`; flag it and ask rather than adding it silently.
  Still not started this session, correctly left alone per the
  new-dependency rule.
- **Rate limiting.** Not yet distributed (would need Upstash or similar,
  same new-dependency caveat as above). Still not started this session,
  correctly left alone.
- **CSP nonce.** Investigated this session. `apps/web/next.config.ts`
  currently ships `script-src 'self' 'unsafe-inline'` with a comment
  explaining why: the App Router injects inline bootstrap scripts with no
  nonce today. A real fix needs per-request nonce generation in
  `apps/web/src/middleware.ts`, threading that nonce through the root
  layout via `next/headers`, and confirming no inline script on any route
  breaks under the tightened policy. That is a genuine behavior change to
  a security header touching every page, not a small isolated diff, so it
  was not attempted unattended this session. Next session: implement
  behind a careful manual pass through the app in a real browser before
  merging, or flag to the owner if the App Router's own inline scripts
  turn out not to support nonces cleanly.
- **Response caching/pagination on a couple of endpoints.** Checked this
  session: the `video_generations`/`scheduled_posts`/`projects` reads in
  `apps/web/src/features/library/queries.ts`,
  `apps/web/src/app/dashboard/overview/queries.ts`,
  `apps/web/src/app/dashboard/overview/aggregates.ts`,
  `apps/web/src/lib/api/resources.ts`, and `apps/web/src/lib/generation/
  history.ts` are already bounded (`.limit(...)`, `count: "exact"` head
  requests, or single-row `eq` lookups). Did not find an actual unbounded
  list endpoint to fix. Leaving this open in case a specific endpoint
  surfaces later, but it may already be done; re-audit before assuming
  there is real work here.
- **Storage lifecycle rules.** Looked at this session. Supabase Storage has
  no built-in object-lifecycle/TTL feature (unlike S3), so this would mean
  writing a new scheduled cleanup job that deletes objects past some
  retention window. Two problems: what counts as "expired" for avatars,
  generated videos, and uploads is a product/retention decision, not an
  engineering one, and a cleanup job that deletes real user files is
  exactly the kind of destructive, hard-to-reverse action `RULES.md` says
  needs the owner. Moving this to "Needs the owner" below rather than
  guessing a retention policy.
- **Webhook secret in a header instead of a query string**
  (`supabase/functions/kie-callback/index.ts`). Investigated by the
  orchestrating session: kie.ai's callback API only accepts a
  `callBackUrl` string, no custom headers, so the query-string secret is
  likely the only viable delivery mechanism kie.ai supports. This also
  touches an auth/security boundary per `RULES.md`. Moving this to "Needs
  the owner" below: either confirm the query-string approach is accepted
  as-is, or provide evidence kie.ai supports a header-based alternative.
- **`regenerateGeneration` swallowed the real error message.** Fixed and
  shipped 2026-08-22, PR #123 (merged to main).
- **`extendGeneration` swallowed the real error message.** Found during
  this session's own sweep for the same pattern: it read
  `error.context.error` directly on a `FunctionsHttpError`, but `.context`
  is the raw `Response` object, not parsed JSON, so that field never
  existed and every failure fell through to a generic message. Fixed and
  shipped 2026-08-22, PR #124 (merged to main), reusing the existing
  `edgeFunctionErrorMessage` helper. Swept the rest of the codebase for
  the same `supabase.functions.invoke` pattern; the only other caller is
  `apps/web/src/app/api/cron/reconcile-generations/route.ts`, which logged
  `error.message` (the same hardcoded "non-2xx" string, not the real
  reason) rather than the actual failure. Fixed and shipped 2026-08-22,
  PR #125 (merged to main), reusing the same `edgeFunctionErrorMessage`
  helper. The `supabase.functions.invoke` sweep is now complete: every
  caller surfaces the real edge function error.
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
  open-ended, not a sign anything is broken. Attempted again 2026-08-22
  (second session): the Claude Browser preview tools did work against the
  local dev stack (`pnpm dev web`, already running), and the landing page
  rendered correctly after a stale-asset reload. But the browser pane
  became unresponsive (30s timeouts) partway through scrolling the
  landing page, before reaching the dashboard, composer, or settings
  screens behind auth, so no real walkthrough happened and no changes
  were made. Needs a session with more stable browser/preview access to
  actually complete the walkthrough.
- **Billing/growth upsell surfaces.** Not started. First real task for the
  Billing/Growth Designer role: find natural, honest moments to prompt a
  free-tier user toward upgrading (a plan limit hit, a locked feature),
  matching `docs/ui.md`'s restraint-over-decoration standard. Every claim
  in the copy must describe something actually live today.

## In flight

Nothing. Session below finished cleanly with everything merged.

## Session log

- **2026-08-22, setup.** This file created alongside `TEAM.md`, `RULES.md`,
  `START_HERE.md`. No engineering session run yet under this system.
- **2026-08-22, first scheduled session.** Shipped PR #123
  (`regenerateGeneration` real-error fix) and PR #124 (`extendGeneration`
  real-error fix, found during this session's own sweep for the same
  pattern), both merged to `main`. Investigated CSP nonce, response
  caching/pagination, and storage lifecycle rules from the "Open, safe to
  work" list; pagination turned out to already be handled everywhere
  checked, CSP nonce is real but too broad a behavior change to do
  unattended without a real-browser pass across every route, and storage
  lifecycle needs a retention-policy decision from the owner before any
  code makes sense, so it moved to "Needs the owner". Also moved the
  kie-callback webhook-secret item to "Needs the owner", per the
  orchestrating session's own investigation that kie.ai's callback API
  does not support custom headers. Observability and rate limiting
  correctly left untouched (new-dependency rule). Next session: CSP nonce
  is the best-scoped remaining item if someone wants to spend a full
  session on it with real-browser verification; otherwise another pass
  through "UI/UX standing pass" or "Billing/growth upsell surfaces" is
  open-ended and safe to pick up any time.
- **2026-08-22, second scheduled session.** Shipped PR #125
  (`reconcile-generations` cron now logs the real edge function error via
  `edgeFunctionErrorMessage`, same fix pattern as #123/#124), merged to
  `main`. That completes the `supabase.functions.invoke` sweep started
  last session. Attempted the UI/UX standing pass: got the local dev
  stack and Claude Browser preview working against `http://localhost:3000`,
  confirmed the landing page renders correctly, but the browser pane
  became unresponsive before a real walkthrough of dashboard, composer,
  or settings could happen. No UI changes made this session. Next
  session: pick up the UI/UX standing pass with a fresh browser session,
  or take the CSP nonce item if someone wants to spend a full session on
  it with real-browser verification across every route.
