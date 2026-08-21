# Scope: next 3 hours

Ordered. Work top to bottom unless CTO re-prioritizes for a genuine blocker.
Check items off as they land, and add a one-line note (PR number, or why
skipped) so this file stays a true record, not a wishlist.

## 0. UI is a marathon priority, not a leftover

Explicit instruction from the owner: the UI matters, work on it seriously
this session, not just as cleanup between backend tasks. Designer/UX Expert
should treat this as standing scope for the full 3 hours, not a single
checklist item — walk the real app (item 6 is a starting point, not the
ceiling), find what looks unfinished, generic, or inconsistent with
[docs/ui.md](../ui.md), and fix it. If nothing else on this list needs
Designer/UX at a given moment, default to UI work rather than sitting idle.

## 1. Fix the production auto-deploy gap (do this first for backend work)

**Correction, checked directly against a real run (32517433834):** this is not
a missing `VERCEL_TOKEN`. That secret has been set on the repo since
2026-07-30. The actual cause is that every CI run's `Verify` job fails
instantly with: "The job was not started because recent account payments have
failed or your spending limit needs to be increased." `deploy-production`
needs `Verify` to pass, so it's skipped every time regardless of the token.
This is the same GitHub Actions billing issue seen earlier this session on
PR #87, never actually resolved.

This needs the owner: fix the payment method or raise the Actions spending
limit under GitHub → Settings → Billing & plans on the account/org that owns
this repo. Once `Verify` can run, confirm one push to `main` actually reaches
production before considering this closed — don't assume it's fixed just
because the billing page looks fixed. Flag and move to the next item rather
than blocking the whole session on it, per RULES.md.

**Status: still blocked on the owner.** Flagged, not re-attempted this
session.

## 2. Re-audit docs/production-readiness.md against current main

It's dated 2026-07-26 against `feature/backend-integration`, predating CI,
tracing, rate limiting, circuit breakers, and a large fraction of the current
codebase. Its "Critical Issues" and readiness score are very likely stale.
Re-check each item against what actually exists on `main` today, using
[docs/ARCHITECTURE.md](../ARCHITECTURE.md) (current, self-audited) as the
cross-check where they disagree. Either update the doc in place or replace it;
don't leave a stale critical-issues list sitting in the repo looking current.

**Status: done, PR #98.** Readiness score updated 64 -> 78. C1 (render
persistence) and H5 (credit race) confirmed resolved by file/line; C3
(observability, no Sentry/APM) is now the largest remaining gap.

## 3. Close the worker trace-id gap

From ARCHITECTURE.md's own open item: publishing jobs in `apps/worker` carry
no trace id, so a failed post can't be traced back to the request that
scheduled it. The generation pipeline already does this correctly
(`sendMessage` → edge function via `traceparent` → stored on the generation
row) — extend the same pattern to the publish path.

**Status: done, PR #99.** Most of the plumbing already existed (trace_id
column, write at schedule time, success-path logging); the real gap was the
BullMQ failure handler, which only had `job.data` and never saw a trace id.
Reads it back off the row now, same idiom as the kie-callback edge function.

## 4. Sweep for dead code and unused exports

This session's own merges (particularly the multi-shot-ui branch, which
turned out to be fully superseded by refactors already on `main`) suggest
there may be more of this. Search for exports with no importers, especially in
`apps/web/src/features/*` and `packages/*/src`, and remove what's genuinely
unused. Don't remove anything still referenced from a test, a script, or a
dynamic import.

**Status: done, PR #100.** Removed a mock-data dashboard component superseded
by `features/schedule`, unused TTS/transcription server actions, and dead
tool-schema scaffolding from an abandoned tool-calling approach in
`ai-gateway`. Left brand icons, `recordGenerationOutcome`, and the
prompt-engine schema aliases in place with reasoning noted on the PR.

## 5. Verify the render-persistence gap (production-readiness.md's old C1)

Original claim: kie.ai result URLs are temporary but were being stored as the
source of truth instead of copied to durable storage, risking silent loss.
Check whether this was already fixed (a lot has shipped since); if not, it's
real and worth fixing before any real generation traffic. If it was fixed,
say so plainly in the doc re-audit (item 2) rather than leaving a phantom
critical issue on record.

**Status: done, folded into item 2's PR #98.** Already fixed: `persistRender`
in `supabase/functions/_shared/store.ts` downloads and validates the kie.ai
result before uploading it to the `renders` bucket; the publish worker reads
the durable storage path, not the provider URL. One residual soft spot noted
in the doc: a storage-upload failure inside `persistRender` falls back to the
original kie.ai URL silently instead of alerting.

## 6. UI pass: verify the idea-refiner flow end to end in a real browser

The wrapping bug reported earlier this session turned out to be a stale
deploy, not a code bug, but it was never checked past that one component. Walk
the full idea → refine → brief → script flow in the actual running app (not
just reading the JSX) and screenshot anything that doesn't look right at
mobile width, where the earlier bug would have shown up.

**Status: done, PR #102.** Walked the full flow against a local Supabase
stack, desktop and mobile (375px), no wrapping regressions. Found and fixed a
real bug along the way: the idea-refiner's clarifying-question options were
silently hard-truncated at 40 characters with no ellipsis, so a long option
cut off mid-word ("...the textures a"). Broader UI sweep of dashboard,
library, assets, schedule, discover, settings, dark mode, and the command
palette turned up nothing else.

## 7. Backlog grab-bag (pull from as time allows, in this order)

- Confirm `apps/worker`'s BullMQ retry/backoff behavior against a genuinely
  failing platform API call (simulate the failure, don't assume the config is
  correct because it reads correctly).

  **Status: done, PR #103.** Genuinely simulated, not read-through: a real
  BullMQ Queue/Worker against local Redis confirmed a 500 retries all 5
  configured attempts on the real exponential(5s) backoff (5/10/20/40s), and
  a 401 ends the job on attempt 1 via `UnrecoverableError` with no retry
  scheduled. No gap found, config behaves as declared.

- Check the Supabase migrations directory for anything not yet applied to the
  live project (this has happened before this session, with
  `0075_prompt_templates.sql`).

  **Status: checked, still real.** `supabase migration list --linked`
  confirms `0075_prompt_templates.sql` is still local-only, not applied to
  the live project. Not applied this session: pushing a schema change to a
  live database needs the owner per RULES.md, not a mid-session call.

- Review `packages/ai-gateway`'s circuit breaker: per-process state means each
  serverless instance learns an outage independently. Note whether this is
  still an accepted trade at current traffic or worth a shared Redis-backed
  breaker now.

  **Status: reviewed, no change needed.** Per-instance relearning costs a few
  wasted round-trips per outage, not correctness (each failed call still
  falls over to the next model). Current traffic is below even the Launch
  tier in running-costs.md. Revisit at Launch/Scale tier, not now.

## Explicitly out of scope this session

- Any real video generation (costs real, non-refundable credits — see
  RULES.md).
- Anything in ARCHITECTURE.md's "when to revisit" list (service extraction,
  microservices). Nothing currently meets those conditions; don't start one
  because 3 hours feels like enough time.
- New third-party dependencies or services.
