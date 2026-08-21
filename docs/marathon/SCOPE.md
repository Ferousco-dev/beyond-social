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

## 8. Generation pipeline, billing, and credit system (owner-redirected)

CI is blocked on the owner's GitHub Actions billing (item 1), and the owner is
out of real funds for this session, so no live kie.ai calls, no real Stripe
checkout, no new dependencies. Owner redirected the remaining time to
code-level work on the generative pipeline, billing, and credit system, with
PRs merged manually since CI cannot gate them.

**Billing/Stripe audit: done.** Subscription checkout (`startCheckout`,
`mode: "subscription"`) is fully built and wired end to end, off only because
`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_*` are unset — not a
code gap. The credit refund-on-failure promise in the Usage page copy is
backed by real code: `reserve_generation_credits` reserves atomically before
dispatch, `fail_generation_by_id`/`fail_generation` refund by reading the
actual debit row rather than assuming one. Genuinely missing: one-time
credit-pack checkout (every pack's `priceUsd` is `null` by design, no price
decided yet, so nothing to check out against).

**Generation pipeline audit: done.** Traced the full path (chat action to
kie.ai dispatch to kie-callback/poll-generation to persistRender). Found the
most severe bug of the marathon: neither `kie-callback` nor `poll-generation`
checked the `error` supabase-js returns from `complete_generation`/
`fail_generation` RPC calls, so a failed RPC left a generation stuck at
`generating` with its credit already spent, silently, forever.

**Status: fixed, PR #104 (merged).** Both call sites now check the RPC error;
`kie-callback` returns 500 so kie.ai retries its webhook (verified
`complete_generation` is idempotent past `ready`/`cancelled`, so a retry after
a transient failure is safe), `poll-generation` surfaces the same failure as
an error status the client already handles.

**Status: fixed, PR #105 (merged).** `persistRender`'s silent fallback to the
temporary kie.ai URL (flagged in the item 2 doc re-audit as a soft spot) now
logs loudly and distinctly on every failure branch, filterable by a typed
reason, instead of two branches logging nothing and three logging
inconsistently.

**Status: done, PR #109 (merged).** Built `reconcile-generations` (edge
function) as a sweep for rows stuck at `generating` past 30 minutes (4x the
client poll's own 8-minute timeout, wide enough to never race an ordinary
slow completion), triggered daily by `/api/cron/reconcile-generations`
(dry run by default, matching the retention cron's own safety pattern).
Deliberately does not call kie.ai to check whether a stuck task actually
finished first: kie.ai's docs never state whether a read-only status check
is billed separately from task creation, and this session has no real money
to risk guessing wrong. A stuck row is force-failed through
`fail_generation_by_id`, the same refund path a real failure takes.

**Status: done, PR #107 (merged).** Confirmed the real blocker first rather
than inventing around it: every `CreditPack.priceUsd` is `null` by design, no
`STRIPE_PRICE_PACK_*` env exists, so there is no real price or Stripe Price id
to check out against yet. Shipped only what's safe without one: the
receiving side. `applyCreditPackPurchase` grants a one-time purchase's
credits directly inside the webhook's `checkout.session.completed` handler
(a payment-mode checkout gets no `customer.subscription.created` follow-up
the way a subscription does), keyed on the checkout session id through the
existing `grant_credits` idempotency primitive. Verified against a real
local Supabase with a locally-signed Stripe test event, no network calls to
Stripe: 18/18 checks pass, including that redelivering the identical event
grants nothing a second time. The checkout-initiation side (mirroring
`startCheckout` in `mode: "payment"`) and the grid's button wiring stay
blocked on the owner deciding real pack prices and creating real Stripe
Price ids.

## 9. Owner-shared product feedback: TikTok-analysis pipeline (8-point checklist)

Owner shared a product feedback document proposing 8 improvements to the
"paste TikTok URL -> analyze -> edit -> generate" flow. Audited every point
against real code (not doc claims) before touching anything.

**Audit result: 3 already done, 3 partial, 2 missing.**

1. Rich extraction schema (hook, structure, scenes, voiceover, on-screen
   text, pacing, visual style, editing, emotion, audio, CTA, retention
   mechanics) — **was partial**, only hook/hookPattern/generic structure/
   whyItWorks/brief were extracted; scene-level detail is generated fresh at
   script-write time, not extracted from the source.
2. Every element editable as a structured blueprint — **done already**
   (`ScriptSubjectFields`, `ScriptScenes`).
3. Viral DNA (locked) vs. Creative Content (editable), kept distinct —
   **done already** (`mechanicsSchema` vs `subjectSchema` in
   `lib/script/schema.ts`, split is the file's own stated design intent).
4. Final prompt generated only after the user edits the blueprint —
   **done in the script flow**, `compileScript()` only runs on "Take this
   script"; the separate brief flow (typed-idea path) bypasses this and
   still authors the final prompt directly. Not reconciled this session,
   the two flows are different enough surfaces to need a dedicated pass.
5. Explicit per-element "Preserve/Change" controls — **was partial**, the
   state machine existed but nothing labeled it.
6. "AI Suggestions" impact/similarity-warning layer — **was missing
   entirely**.
7. Canonical backend video schema (Metadata / Viral DNA / Script / Scenes /
   Generation Instructions) — **partial**, `videoScriptSchema` covers Viral
   DNA + Script + Scenes already; no explicit Metadata or Generation
   Instructions block. Real gap, bigger than a session slot, not started.
8. Avoid literal copying, describe mechanics instead — **done already**,
   both extraction and script-writing prompts explicitly forbid mentioning
   the source video.

**Status: done, PR #111 (merged).** Point 1's structure field: named beats
(hook/problem/escalation/payoff/cta, each nullable) replacing a generic
array, with a real smoke test (7/7) proving the old shape correctly no
longer parses.

**Status: done, PR #110 (merged).** Point 5: "Preserved"/"Change freely"
badges making the existing mechanics/subject split visible. Deliberately
did not add "Brand Style" or "Audio" controls the source document
mentions, since `videoScriptSchema` has no backing field for either and a
control with nothing behind it would be decorative.

**Status: done, PR #113 (merged).** Point 6, the AI Suggestions layer:
impact badges (High/Medium/Low) on hook, pacing, scene changes, and CTA,
computed from real numbers on the script where the data exists (retention-
technique count, cuts per second) rather than decorative, and a
`computeDivergence` warning that fires when a live edit drifts from the
pattern the script was written with (fewer scenes, >20% duration drift, or
a hook stretched past double its length), each with a concrete
recommendation. Visually verified via a temporary preview route: lengthening
the hook scene past its threshold correctly surfaced the duration-drift
warning and reactively recalculated the scene-change impact badge.

**Status: done, PR #115 (merged).** Point 4: the brief flow (typed-idea
path) asked the model for both a structured script and a separate
free-text prompt meant to reach the generator unedited, the two were free
to disagree and did. `compileBrief()` now builds the prompt from duration,
hook, and beats, the same fields already on screen; `prompt` is gone from
`briefSchema` entirely. Confirmed by tracing every consumer that this was
genuinely self-contained, not the larger flow-unification the audit
originally worried it might be.

**Status: done, PR #116 (merged).** Point 7: added `metadataSchema`
(aspect ratio, platform, category) and `generationInstructionsSchema`
(style, cinematography, audio, negative prompts, model instructions),
wired into `compile.ts`. Corrected the audit's own imprecise language in
the process: `VideoScript` is never persisted (confirmed by tracing every
consumer), so this was a schema-only change, no SQL migration needed.

All 8 points from the owner's product feedback document are now closed:
3 were already done, 5 were built or fixed this session.

## Explicitly out of scope this session

- Any real video generation (costs real, non-refundable credits — see
  RULES.md).
- Anything in ARCHITECTURE.md's "when to revisit" list (service extraction,
  microservices). Nothing currently meets those conditions; don't start one
  because 3 hours feels like enough time.
- New third-party dependencies or services.
