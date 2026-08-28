# Backlog

Live work queue for the recurring loop-engineering sessions. The Task
Manager role updates this at the start and end of every session; treat
anything older than a few days with suspicion and re-verify against the
real repo state before acting on it.

Seeded 2026-08-22, right after the 2026-08-21 marathon session (17+ PRs
merged that day, `docs/marathon/SCOPE.md` has the full record).

## Needs the owner (do not start until unblocked)

- **`base_branch` in the Telegram-agent task flow bypasses the input safelist
  its sibling fields enforce.** Found 2026-08-28 auditing
  `services/telegram-agent/` (a new service, PRs #146-155, not yet swept by
  this system). `lib/tasks.py`'s `_TASK_ID_RE` and `_SESSION_RE` restrict
  `task_id`/`session_id` to a narrow charset (`[0-9a-f]`, `[A-Za-z0-9_-]`),
  but ``_BRANCH_RE = re.compile(r"branch:([^\s`]+)")`` admits almost any
  non-whitespace, non-backtick text. `parse_task_reference()` reads this
  from the text of any prior message in the chat a user replies to (not
  necessarily a bot-generated one), and it flows unsanitized as
  `base_branch` through `lib/commands.py` and `lib/github_client.py`'s
  `repository_dispatch` payload into
  `.github/workflows/telegram-claude-task.yml`'s checkout step:
  `ref: ${{ github.event.client_payload.base_branch || github.ref }}`, a
  workflow with `contents: write`, `pull-requests: write`, `issues: write`,
  and an OIDC token. No full exploit chain was found (`actions/checkout`
  takes `ref` as a `with:` input, invoked via git argument arrays, not
  spliced into a `run:` shell string, and the field is only reachable by an
  already-allow-listed Telegram user, not a new external privilege
  escalation), but there is no stated reason this one field should skip the
  charset restriction its two siblings apply, and it is an unvalidated
  value feeding a privileged workflow's checkout ref. This is exactly the
  security-boundary-shaped category `RULES.md` says needs the owner's own
  look rather than an "obviously correct" fix applied silently. Owner
  should either tighten `_BRANCH_RE` to a safe branch-name charset (mirroring
  `_TASK_ID_RE`/`_SESSION_RE`) or confirm the current behavior is
  acceptable given the narrower practical reach.
- **Vercel production deploy.** Everything merged through 2026-08-21 is on
  `main` but not yet live. Owner runs `cd apps/web && vercel deploy --prod
--yes --archive=tgz` themselves; this system does not deploy.
- **kie.ai account balance.** Confirmed root cause of "videos not
  generating": the render provider's own account balance ran too low.
  Needs a real top-up.
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
- **CSP nonce.** Investigated again this session, moved here from "Open,
  safe to work": it is a real product tradeoff, not just an engineering
  task, so it should not ship unattended even with full browser
  verification. Next.js's own documented pattern for a nonce-based CSP
  (App Router) is: generate the nonce in middleware, set it as `x-nonce`
  on the response headers, and read it in the root layout via `headers()`
  from `next/headers` so it can be applied to Next's own injected inline
  scripts. The problem is that calling `headers()` anywhere in a layout
  opts that entire route into dynamic rendering, because a nonce is
  per-request and cannot exist at build time. `apps/web/src/app/layout.tsx`
  currently reads neither `cookies()` nor `headers()`, and says exactly why
  not: "Deliberately not read with `cookies()`: that would make every page
  in the app dynamic." A nonce in the root layout means every route in the
  app, including the marketing/landing pages that are static today,
  becomes dynamically rendered on every request. That is the same cost the
  code already explicitly chose to avoid for cookies, now paid anyway for
  the CSP header. Separately, `apps/web/src/middleware.ts`'s matcher is
  also deliberately narrow (see its own comment) specifically to avoid
  paying a Supabase `getUser()` round trip on marketing pages; a nonce
  needs the matcher broadened to run on every route, though that half is
  cheap since nonce generation itself does not need to call
  `updateSession`. `docs/production-readiness.md`'s H3 currently calls
  this "independently shippable and reversible," which undersells the real
  cost; worth a note there too next time that doc gets a pass. This is a
  genuine security-hardening-versus-performance tradeoff on a decision the
  codebase already made once, so it belongs with the owner: confirm
  whether losing static rendering site-wide is worth closing the
  inline-script gap (which `object-src 'none'`, `base-uri 'self'`, and
  `frame-ancestors 'none'` already narrow significantly), or whether a
  scoped alternative (nonce only on the handful of routes that actually
  need it, static elsewhere) is preferred instead.

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
- **Type-safety and correctness sweep, 2026-08-25.** Five small, independent
  fixes, each its own PR:
  - `handToProvider`/`persistRender` in `supabase/functions/_shared/{reference,store}.ts`
    took their Supabase client parameter as `any`, disabling type checking at
    every call site. Typed as `SupabaseClient`, matching every caller. PR
    #134 (merged). Confirmed this was the only `any` usage left anywhere in
    the repo.
  - `setWebhookActive` and `deleteWebhook` in
    `apps/web/src/features/webhooks/actions.ts` had bare `catch {}` blocks
    with nothing logged, unlike their siblings two functions above
    (`createWebhook`, `rotateWebhookSecret`) in the same file. PR #135
    (merged). Every other bare `catch {}` in the repo was confirmed to be a
    deliberate, commented localStorage-convenience case, not a bug.
  - `toInstant` (the local-wall-clock-to-UTC-instant conversion) was
    byte-identical and duplicated between
    `apps/web/src/features/publishing/actions.ts` and
    `apps/web/src/features/schedule/lib/instant.ts`, with the second copy's
    own comment already flagging it as a deliberate, temporary duplicate
    that belonged in `lib/time`. Moved into
    `apps/web/src/lib/time/zone.ts`, both call sites updated. PR #136
    (merged).
  - `renderClipSchema` (mirrored in `apps/worker/src/lib/render-spec.ts` and
    `apps/web/src/lib/editor/render-spec.ts`) documented `endSeconds` as
    "always greater than `startSeconds`" but never checked it: a clip
    violating that invariant passed validation at the trust boundary meant
    to catch it and would have built an invalid ffmpeg trim filter deep in
    `stitchTrimmedClips`. Added the missing `.refine()` to both copies. PR
    #137 (merged). Not reachable through the current editor UI
    (`specFromProject` already filters `end <= start`), so this is a
    defense-in-depth fix for any other producer of a `project_renders.spec`
    row, not a live user-facing bug today.
  - `extendGeneration` called `checkVideoRun()` with no model argument, so
    the pre-flight credit gate always checked the `veo3_fast` default price
    while `supabase/functions/extend-video/index.ts` always reserves
    credits against the source clip's own model. A continuation on a
    cheaper model than `veo3_fast` could be wrongly refused by the gate
    before ever reaching the edge function. This is the exact bug class
    `checkVideoRun`'s own doc comment already warns about; `startGeneration`
    was fixed for it, `extendGeneration` was missed. Now reads the source
    generation's model before gating. PR #138 (merged). Checked
    `regenerateGeneration` for the same bug: it also omits the model, but
    its `generate-video` invoke never passes one either, so gate and
    dispatch agree there; left untouched. None of the five PRs needed a
    browser to verify: type-only, logging-only, a verbatim move, and two
    schema/logic fixes traced by hand and, where practical, checked with a
    throwaway `tsx` script against the real function.
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
- **Idempotency key on `generate-video`'s start path.** `production-
readiness.md`'s M4 notes this as the one remaining gap after scheduling
  (`supabase/migrations/0028_publishing_idempotency.sql`) got the same
  treatment. Considered 2026-08-25 and set aside as too large for one
  unattended unit, not because it isn't real: a genuine fix needs a
  migration (an `idempotency_key` column plus a user-scoped unique index on
  `video_generations`, mirroring 0028's pattern), edge-function dedup logic
  in `generate-video/index.ts` before the row is inserted and credits
  reserved, and client-side wiring across three call sites that each submit
  differently (`lib/chat/turn.ts`'s full chat flow, and
  `regenerateGeneration`/`extendGeneration` in
  `features/generation/{actions,extend-actions}.ts`). Unlike scheduling,
  where a duplicate submission is unambiguously wrong, a video generation
  gate has to distinguish "the same click's network request retried" from
  "the user deliberately clicked regenerate twice," which needs a fresh
  client-generated key per gesture, not a key derived from stored data —
  and verifying the UI doesn't already prevent double-submission via a
  disabled-while-pending button needs a real browser, which no recent
  session has had. Worth a full session once a browser tool is available,
  not a partial fix guessed at blind on the credit-charging path.
- **Circuit breaker for AI provider calls is per-process, not shared.**
  Reviewed 2026-08-21, still an acceptable trade at current traffic.
  Revisit once real usage data exists, not on a timer.
- **UI/UX standing pass.** No specific ticket, this is the Designer role's
  default work when nothing else is queued: walk the real app, find what
  looks unfinished or generic, fix it. The 2026-08-21 session did a first
  pass and found the app already at a high bar; this is genuinely
  open-ended, not a sign anything is broken. Attempted again twice on
  2026-08-22 and both got stopped early by an unresponsive browser pane
  before reaching the authenticated screens. Attempted a third time,
  2026-08-22 (this session): found a stray `next dev --port 3010` process
  left running against a stale, half-broken worktree
  (`.claude/worktrees/agent-ac15a79bdd2444cbd`, missing `@swc/helpers`,
  throwing on every request), killed it, and started a clean
  `./dev.sh --no-infra web` on port 3000 against the current `main`
  worktree instead (Supabase's Postgres/Auth/Storage containers were
  already up from a prior session, just not the API gateway containers,
  which weren't needed). Signed up a fresh local test account
  (`ui-audit@local.test`, confirmed through Mailpit per
  `docs/local-stack.md`) and walked, with screenshots at each step: the
  landing page, signup, login, dashboard ("Where do you want to start?"),
  Library (empty state), Assets (photo/product upload state), Schedule
  (calendar), Discover, the composer ("Describe a video to create"),
  and Settings (Account, Connections, Appearance including a live
  light/dark toggle, Billing, API keys). One `computer scroll` call on
  the Assets page hit the same pane-unresponsive failure the last two
  sessions reported, but a single retry (a plain screenshot) recovered
  it immediately and the walkthrough continued without further issue,
  so the tooling itself is not the blocker it looked like before, just
  occasionally flaky on the `scroll` action specifically.
  Result: nothing concretely unfinished, generic, or inconsistent
  found. Every locked/gated feature seen (Studio-only API keys and
  webhooks, not-yet-approved platform connections) explains itself
  inline with real copy and an upgrade path rather than sitting there
  unexplained. Empty states (Library, Assets) are specific to the
  product, not generic placeholder text. Dark mode was checked directly
  against the dashboard and renders consistently. No PR opened this
  session; nothing to fix means nothing to ship. Dev server stopped
  cleanly at the end of the session. Next session: this list has been
  walked thoroughly enough now that it's worth leaving alone for a
  while unless the owner points at something specific; pick up CSP
  nonce or billing/growth upsell surfaces instead.
- **Billing/growth upsell surfaces.** First unit shipped 2026-08-23, PR
  #126 (merged): the chat, regenerate, and continue-clip flows already
  told a free-tier user why a video run was refused, but a denial an
  upgrade would actually fix (plan tier too low, credits empty) had no way
  to act on it. Those now carry an inline Upgrade link to the billing
  page, reusing the credit tile's existing link styling; a denial an
  upgrade cannot fix (not signed in, an unknown model, a database hiccup)
  stays plain text. Not real-browser-verified: no computer-use/browser
  tool was available in this session, and reaching an actual denied state
  needs a free-tier account seeded against the local Supabase stack, which
  the session budget did not cover. Worth a manual pass in a real browser
  next time someone has the local stack running with a seeded low-credit
  account. Other upsell moments (a locked feature with no upgrade link,
  a plan-limit hit outside the video-generation gate) are still open if
  anyone finds one.
  Audited fully 2026-08-24: every other plan/credit wall in the app
  already has an upgrade link (integrations lock screen, dashboard header
  upgrade button). One real gap found and fixed, PR #129 (merged): the
  low-balance warning shown alongside a run that still went through
  (`gate.lowBalanceNotice`, distinct from the hard-denial case #126
  covered) never set the flag that turns it into a link in the main chat
  flow. Fixing that surfaced the same gap two more places, `regenerateGeneration`
  and `extendGeneration`, which call the same gate but had no field on
  their result type to carry the notice at all; fixed and shipped
  together, PR #131 (merged). Not real-browser-verified for the same
  reason as #126: no browser tool this session, and a real low-balance
  state needs a seeded low-credit account. This closes the upsell-surface
  sweep; nothing else found without a browser pass to look for it.

## In flight

Nothing. Session below finished cleanly with everything merged.

## Session log

- **2026-08-28, ninth scheduled session.** No Docker daemon again this session
  (`docker ps` fails to connect, same as the sixth through eighth sessions),
  so no local Supabase stack and no authenticated UI walkthrough. Installed
  Deno v2.9.6 fresh (this environment does not persist between sessions), not
  actually needed this session since nothing touched `supabase/functions`.
  GitHub access was normal throughout.

  Two new services now exist in the repo that no prior loop-engineering
  session had swept: `services/telegram-agent` (a Telegram-triggered remote
  Claude Code engineering bot, PRs #146-155, built by that bot's own separate
  automation between the eighth session and this one, unrelated to this
  scheduled system) and `services/mail` (a BullMQ-based transactional-email
  worker with a Resend provider, also new, apparently added around the same
  time). Neither had been read by this system before. Gave both a first pass
  this session, on top of finishing the `apps/worker` BullMQ queue/job sweep
  the eighth session's log flagged as the next fresh corner:

  - **`apps/worker`'s scheduler/queue config**: found and fixed one real bug,
    PR #156 (merged). `startScheduler`'s and `startRenderScheduler`'s scan
    loops claimed a row (moving it out of `scheduled`/`queued` atomically via
    `claim_due_posts`/`claim_queued_renders`) and then called `queue.add()`
    with no error handling. A failed enqueue (a Redis blip, or a shutdown
    mid-scan, since `stopScheduler`/`stopRenderScheduler` only clear the
    timer and don't await an in-flight scan before the queue connection
    closes) stranded the row in `publishing`/`generating` forever: no future
    scan reclaims it, since both claim functions only select
    `scheduled`/`queued` rows, and nothing else was processing it. Fixed by
    reverting the row's status on a failed enqueue so the next scan reclaims
    it, which is the retry the scheduler's own comments already described as
    safe but nothing was actually triggering. Everything else in the
    publish/render queue config (retry counts, backoff, `UnrecoverableError`
    classification, the `claim_post_for_publish` idempotency guard) checked
    out clean.
  - **`services/telegram-agent`**: security-focused audit found the core
    trust boundaries (Telegram webhook secret, GitHub callback HMAC
    signature, the Telegram user allowlist) all correctly implemented and
    checked before any state-changing action, and no shell-injection path in
    the `.github/scripts/*.sh` helpers. Two real findings: `cancel_run()` in
    `lib/github_client.py` computed a rejection's HTTP status but never
    logged it, unlike its two sibling functions in the same file, a plain
    code bug, fixed and shipped, PR #158 (merged). Separately, `lib/tasks.py`'s
    `_BRANCH_RE` regex lets `base_branch` through almost unrestricted (unlike
    `_TASK_ID_RE`/`_SESSION_RE`, which are charset-limited), and that value
    flows unsanitized into `telegram-claude-task.yml`'s `actions/checkout`
    ref for a workflow with `contents: write`/`pull-requests: write` and an
    OIDC token. No exploit chain confirmed (only reachable by an
    already-allow-listed user, and lands in a `with:` input rather than a
    `run:` shell string), but it is security-boundary-shaped input
    validation with no stated reason to differ from its siblings, so it was
    routed to "Needs the owner" above rather than patched silently, PR #157
    (merged, docs-only).
  - **`services/mail`**: no live caller exists anywhere in the repo yet
    (confirmed by grep: nothing enqueues into this queue or inserts into
    `mail_deliveries`), so every finding here is latent, not yet
    user-facing. Two real bugs found and fixed. First, three writes in
    `processors/send-mail.ts` never checked the Supabase error they got
    back: the "sent" write, the `block_delivery` RPC call, and the
    terminal-failure write in `worker.on("failed")`. The "sent" write
    mattered most: `claim_delivery_for_send`'s only duplicate guard is
    `provider_message_id IS NULL`, so a failed write there after the
    provider already accepted the message would leave the row exactly as
    claimable as one that never sent, and a later retry or crash-recovery
    replay would send a real second email. Fixed by mirroring the identical,
    already-correct `settleError` pattern in `apps/worker`'s
    `publish-post.ts`, PR #159 (merged). Second, `renderTemplate` (which
    includes `interpolate()`, already throwing `PermanentSendError` for a
    missing placeholder or template) was called outside the
    `try`/`catch` that converts `PermanentSendError` to `UnrecoverableError`,
    so a permanently broken template or payload silently retried five times
    over the full backoff instead of failing immediately, defeating intent
    the code already stated in its own comments; the payload-shape check
    just above it had the same gap from a different angle
    (`mailPayloadSchema.parse` threw a raw `ZodError`, never converted).
    Fixed by moving both calls inside the try block and adding a
    `parsePayload()` helper that converts a shape mismatch to
    `PermanentSendError`, PR #160 (merged).

  Two process notes worth recording:
  - The GitHub MCP `create_pull_request`/`update_pull_request` tools still
    auto-append an AI-attribution footer to the PR body on every call, not
    just PR creation as the eighth session's log guessed. Stripped it from
    all five PRs this session via a follow-up `update_pull_request` call
    with the footer omitted; needs doing every time, not once.
  - CI on the first three PRs (#156-158) all failed identically on
    `format:check`, traced to `services/telegram-agent/README.md` already
    failing `prettier --check` on `main` before any of this session's
    changes (confirmed directly against `main` at `6d69acb`), unrelated
    formatting drift left over from PRs #146-155. Ported the `prettier
--write` fix into all three PRs rather than waiting on a separate fix to
    land first (it no-ops once one of them merges into `main`), each with a
    PR comment naming the failure and why it wasn't that PR's own bug, per
    the standing CI-red discipline.

  Five PRs shipped and merged (#156, #157, #158, #159, #160), zero left in
  flight. A final full-repo `pnpm typecheck` (14/14 tasks) and `pnpm lint`
  (9/9 tasks, only the pre-existing `retry-verification.ts` console-usage
  warnings noted in prior sessions) both passed clean on the merged `main`
  before stopping. Next session: `services/mail` and `services/telegram-agent`
  got a first pass but not the same exhaustive sweep `apps/worker` and
  `apps/admin` have had across multiple sessions now; `services/mail`'s
  `lib/providers/resend.ts` (the actual Resend HTTP call) and
  `queues/mail.ts` config, and `telegram-agent`'s `app.py`/`commands.py`
  beyond the security-focused pass, are reasonable next targets. The new
  "Needs the owner" item (`base_branch` validation) is small and
  well-scoped if the owner wants to knock it out. Otherwise the standing
  items are unchanged: CSP nonce and observability/rate limiting need the
  owner or a new dependency; a real browser/UI pass is still worth trying
  fresh each session since availability has varied session to session.

- **2026-08-27, eighth scheduled session.** No docker daemon again this
  session (`docker ps` fails to connect, same as the sixth and seventh), so
  no local Supabase stack and no authenticated UI walkthrough. GitHub access
  was normal throughout (push, PR create, PR merge all worked without the
  403/stale-session issue the fourth session hit).

  Continued the code-quality/correctness sweep from the sixth and seventh
  sessions, targeting the specific unswept corners the seventh session's
  log named as candidates: worker render/stitch temp-file handling under
  concurrency, the trends/Firecrawl refresh cron path, `packages/prompt-
engine`'s embedding cache, and anything under `apps/admin` not already
  covered. Ran four research rounds total (three in parallel, a fourth
  after), each read-only and verified by hand before anything shipped:

  - **Worker render/stitch under concurrency**: clean. Every render/stitch
    workspace (`apps/worker/src/processors/render-video.ts`,
    `apps/worker/src/lib/stitch.ts`, and the newer `services/render`
    implementation) uses `mkdtemp` for a per-job/per-invocation directory
    with cleanup scoped to that same directory in a `finally`, so no
    cross-job collision or premature-delete is possible even under real
    concurrency. `startRenderWorker` also runs at `CONCURRENCY = 1` by
    design, and renders are additionally deduped by a `jobId` and an atomic
    DB claim. Noted but not acted on: `lastFrame` in `apps/worker/src/lib/
stitch.ts` has zero callers anywhere in the repo (confirmed by grep),
    worth a look next time dead code is in scope; and `services/render` vs
    `apps/worker` are two independent implementations of the same render
    pipeline, a design question, not a bug.
  - **Trends/Firecrawl cron path**: found and fixed a real bug, PR #144
    (merged). `Firecrawl.search()`/`.scrape()` (`apps/web/src/lib/trends/
firecrawl.ts`) parsed the API's `success`/`error` fields but never read
    them; since every field in the response schema is optional, an
    API-level failure returned with HTTP 200 (`{success: false, error:
"..."}`) parsed cleanly and fell through to returning `[]`/`null`,
    discarding the real error. `discoverTrends()`'s own doc comment states
    its whole purpose is making a silently-failing source distinguishable
    from a genuinely quiet day, but that safeguard only fires on a thrown
    error, so this bypassed it entirely: a run would finish as `sources: 0,
discovered: 0, ok: true`, indistinguishable from nothing trending. Fixed
    by throwing `FirecrawlError` with the real message on `success ===
false`, reusing the existing error type and reaching the existing catch
    in `discoverTrends`. Added two new cases to `apps/web/scripts/trends-
smoke.ts` (17/17 passing). Also noted: `/api/cron/discover-trends` is
    not currently scheduled in `vercel.json` (its own comment says so), so
    this affects manually-triggered runs only today, but the fix is correct
    regardless of when the route is wired back up.
  - **`packages/prompt-engine`'s embedding cache**: clean. Cache keys are
    `model:sha256(text)`, collision-proof and correctly scoped per model;
    the persisted table has a real pruning cron; the in-memory cache is a
    correctly bounded LRU; concurrent misses on the same key cost redundant
    work but never produce a wrong result. One thin, deliberately-not-shipped
    nit: within a single batch, only the first cache-miss occurrence of a
    repeated text is tracked for in-flight dedup, so later duplicates each
    re-issue their own cache lookup; output is still correct, just a wasted
    lookup.
  - **`apps/admin`**: clean, read broadly rather than trusting the prior
    session's undocumented "admin-debug-console sweep" reference (no
    matching PR exists in the log or git history for what that covered).
    Every mutation path follows the same disciplined pattern: `requireAdmin()`
    gate, Zod validation, a SECURITY DEFINER RPC that re-checks admin and
    audits in the same transaction, every Supabase error checked, keyset
    pagination done correctly. No silent error swallowing, no missing
    awaits, nothing stale found anywhere in `features/debug`, `features/
users`, `features/config`, `features/queues`, `features/secrets`,
    `features/deleted`, `audit`, `lib/health`, `lib/analytics`, `lib/auth`,
    `lib/queues`, or `middleware.ts`.
  - **Fourth round** (retention cron, every `/api/v1/*` route, the Stripe
    webhook handler): clean. `/api/cron/retention` fails closed on auth,
    is correctly global-scope by design (not a tenant leak), and its four
    backing SQL functions are idempotent and safe to partially fail.
    `/api/v1/generations|usage|openapi` are all correctly scoped to the
    calling user with bounded pagination. The Stripe webhook verifies its
    signature unconditionally before touching anything, and both the
    subscription and one-time-credit-pack paths are protected against a
    redelivered event double-crediting an account (`billing_events` and
    `credit_ledger.external_ref` unique-index-backed idempotency
    respectively).

  One process note worth recording: creating and updating the PR through
  the GitHub MCP tools auto-appended an AI-attribution footer to the PR
  body, which directly conflicts with this project's explicit "no AI or
  assistant attribution anywhere" rule. Updating the PR body without
  including the footer myself did make it disappear (confirmed by reading
  the body back), so it is at least removable after the fact; worth a
  future session checking whether it reappears on further edits, and
  whether the same happens on commit messages or comments, which were not
  tested this session.

  One PR shipped and merged (#144), zero left in flight. `pnpm build`,
  `pnpm lint`, `pnpm typecheck` all passed locally before push, and CI
  (Secret scan, Dependency audit, Verify, Migrations and schema) all passed
  independently before merge. Stopped after one unit rather than manufacture
  a fifth research round: three of four rounds came back clean this session
  (worker render/stitch, prompt-engine cache, admin, and the fourth round
  covering retention/api-v1/webhook), a meaningfully lower hit rate than the
  sixth and seventh sessions' three-of-three, which is a real signal this
  particular vein (silent bugs findable by reading, no browser needed) is
  genuinely thinning now rather than just unlucky on one pass. Next session:
  worth trying a browser/UI pass first if one is available (still unverified
  across eight sessions: the low-balance-notice PRs #126/#129/#131, and
  whether Docker/computer-use is reachable at all varies session to
  session and is worth checking fresh rather than assuming). If no browser
  again, the remaining safe-to-work items are thin: the CSP nonce and
  observability/rate-limiting items need the owner or a new dependency: the
  Zod-message consistency nit (`apps/web/src/features/generation/
actions.ts:161` and three other call sites, noted 2026-08-24) is still
  open and still low value. A genuinely fresh corner to search next time
  Docker is unavailable: `apps/worker`'s BullMQ queue/job configuration
  itself (retry counts, backoff, stalled-job handling) hasn't been swept by
  name in any session log, unlike the render/stitch logic it wraps.

- **2026-08-26, seventh scheduled session.** No browser/computer-use tool and
  no Docker daemon again this session (`docker ps` fails to connect, same as
  the sixth session), so the local Supabase stack and any authenticated UI
  walkthrough stayed unreachable. With UI work off the table, ran three
  rounds of a background research agent, each scoped to a different, not-yet-
  swept corner of the codebase, specifically hunting for genuine,
  mechanically-verifiable bugs rather than repeating prior sessions'
  ground. All three rounds found a real issue, each verified by hand before
  shipping, own PR per fix, all merged same-session after CI went green:
  - **PR #140**: `apps/worker/src/processors/publish-post.ts`'s final write
    (recording `status: published` and the platform's `external_id` after a
    successful post) never checked the Supabase error, unlike every other
    database call in that file. A failed write there left the row stuck with
    `external_id` still null, exactly the signal `claim_post_for_publish`
    (migration 0028) and the admin stuck-post scan (migration 0035) both
    rely on to know a post already went out; a later retry, automatic or an
    admin clicking retry on what looked like a safe row, would have posted
    the same video to a real account a second time. Throwing would not have
    been safe either (the platform had already accepted the post, so a retry
    would call `publishPost` again). Fixed by logging loudly instead,
    mirroring the existing `settle()` pattern in `render-video.ts` built for
    the same class of problem.
  - **PR #141**: `useGenerationPoll`'s `stop()` clears the polling interval
    but cannot cancel a `pollGeneration` request already in flight. Cancel a
    draft while its poll is mid-request, and the stale response still
    resolved and unconditionally fired a notice, sometimes a contradictory
    one ("did not complete, try again") for a draft the user had just been
    told would keep rendering in the background. No data was affected, a
    confusing notice only. Fixed by checking whether `stop()` already ran for
    that generation id before settling a response.
  - **PR #142**: the billing page's "About N runs of X" line picked the
    single cheapest active model across every family and every `min_plan`,
    with no check that the signed-in user's plan could actually run it.
    `cheapestRunCost()` in `lib/credits/queries.ts` already established the
    right filter for this exact question (family=video, min_plan=free, a
    floor every plan can run) and the billing page's own inline
    reimplementation had skipped both. Not visibly wrong with the current
    catalogue (today's cheapest active row already happens to be
    free/video), but the model catalogue is entirely data-driven by design
    specifically so it can be re-priced without a deploy, and nothing
    stopped a future re-price from pointing a user's balance summary at a
    model they are locked out of. Fixed by scoping the reduction to match
    `cheapestRunCost()`'s filter.

  None of the three fixes were manually verified in a real browser or against
  a live Supabase instance (unavailable this session, as above); each was
  traced by hand against the actual failure sequence and, where an existing
  pattern in the codebase already solved the same class of problem, checked
  for consistency with it. None had existing test coverage to extend: no
  smoke-test harness exists for the worker's BullMQ/Supabase processing loop,
  and no React hook testing infrastructure (vitest/jest/testing-library)
  exists in `apps/web`, so building either would have been a larger unit of
  work than the fixes themselves. `pnpm verify` (build, lint, typecheck)
  passed clean across all 23 workspace tasks after all three merges.

  Three PRs merged (#140, #141, #142), zero left in flight. Stopped here
  rather than run a fourth research round: three of three rounds each found
  exactly one real, worth-fixing issue in a fresh corner of the codebase, a
  healthier hit rate than the sixth session's third scan (which came back
  clean and signalled the easy-bug vein was thinning), so there is no
  present signal that this vein is exhausted. Next session: a fourth round
  targeting still-unswept areas is a reasonable continuation of the same
  approach (candidates not yet covered by any session: `apps/worker`'s
  render/stitch temp-file handling under concurrent renders, the trends/
  Firecrawl refresh cron path, `packages/prompt-engine`'s embedding cache,
  and anything under `apps/admin` not already covered by this session's
  admin-debug-console sweep). Otherwise the standing open items are
  unchanged: CSP nonce and observability/rate limiting (new-dependency,
  needs owner confirmation) are the best-scoped substantial items if a
  browser or the owner's input becomes available; the Zod-message
  consistency nit is still open and still low value.

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
- **2026-08-22, third scheduled session.** Completed the UI/UX standing
  pass that the two prior sessions couldn't finish. Found and cleaned up
  a stray dev server on port 3010 pointed at a stale, broken worktree;
  started a clean one on port 3000 against `main`. Signed up a real local
  test account and walked landing, signup, login, dashboard, Library,
  Assets, Schedule, Discover, the composer, and Settings (Account,
  Connections, Appearance/dark mode, Billing, API keys), with screenshots
  at each step. Found nothing concretely unfinished, generic, or
  inconsistent: locked features explain themselves, empty states are
  product-specific, dark mode is consistent. No PR opened; see the
  "UI/UX standing pass" entry above for full detail. Dev server stopped
  cleanly at session end. Next session: CSP nonce or billing/growth
  upsell surfaces are the best-scoped open items.
- **2026-08-23, fourth scheduled session.** Two important process
  findings, both read this before anything else:
  - **CI is no longer blocked.** The GitHub Actions billing block
    (previously listed under "Needs the owner") is resolved. `Verify` ran
    end to end on both PRs this session (PR #127 confirmed it green
    directly: `format:check`, `lint`, `typecheck`, `build`, and all 6 test
    suites all passed in CI, not just locally). Per `RULES.md`'s own
    instruction ("the day CI comes back, merges should require it green
    again"), treat CI as the real gate from here on rather than falling
    back to the PR Checker's own re-verification as the primary signal;
    the independent-verification discipline itself does not go away, it
    now has CI's confirmation alongside it instead of standing alone.
  - **GitHub write access was completely blocked, then fixed, mid-session.**
    Both `git push` and every GitHub MCP write call (`create_branch`,
    `push_files`) returned 403 for roughly the first half of this session,
    read-only tools worked fine. The finished first unit of work
    (upgrade-link-on-plan-denials) was preserved as a local commit and
    handed to the user directly as a patch file rather than lost, and the
    session paused for the user to fix the GitHub App's permissions.
    Once fixed, `git push` started working immediately but the MCP
    GitHub server's own session stayed stale ("invalid session" on every
    call) for the rest of the session; PR creation and merging were done
    via direct GitHub REST API calls with `$GITHUB_TOKEN` instead
    (`subscribe_pr_activity`/`unsubscribe_pr_activity` kept working
    throughout, they are a separate subsystem from the read/write API
    tools). This is resolved, not an ongoing blocker, but a future
    session hitting "invalid session" on `mcp__github__*` tools while
    `git push` and `get_me` disagree should know the fallback: raw REST
    calls with `$GITHUB_TOKEN` work even when the MCP connector session
    itself is stuck.

  Shipped PR #126 (billing/growth upsell link on plan and credit
  denials, see the "Billing/growth upsell surfaces" entry above for
  detail) and PR #127 (repo-wide `prettier --write`, 22 files, pure
  whitespace, needed because CI actually running again surfaced real
  formatting drift that had accumulated while `format:check` could not
  run at all). Both merged to `main`. Session ran long (past the ~2 hour
  budget) because of the GitHub-access troubleshooting in the middle;
  stopped cleanly here rather than starting a new unit. Next session: CSP
  nonce is still the best-scoped substantial open item; otherwise more
  upsell surfaces or another UI/UX pass.

- **2026-08-24, fifth scheduled session.** GitHub access was normal
  throughout (no repeat of the prior session's 403/stale-session issue).
  Investigated the CSP nonce item first, since it was the standing
  "best-scoped substantial item." Found the real reason it should not
  ship unattended even with full browser verification, not just that it
  is broad: Next.js's nonce-based CSP pattern needs `headers()` in the
  root layout, which opts every route into dynamic rendering, undoing a
  deliberate static-rendering decision `apps/web/src/app/layout.tsx`
  already made once (its own comment explains why it avoids `cookies()`
  for the same reason). That is a real performance-versus-hardening
  tradeoff the owner should decide, not an engineering call this system
  should make silently, so it moved to "Needs the owner" with the
  reasoning recorded, PR #130 (merged).
  Pivoted to auditing every billing/growth upsell surface for a missing
  upgrade link, since that was the other standing open item. Found and
  fixed the one real gap: the low-balance warning (`gate.lowBalanceNotice`,
  distinct from the hard-denial case PR #126 already covered) never set
  the flag that turns a notice into a clickable upgrade link, in three
  places. `turn.ts` (the main chat flow) fixed first, PR #129 (merged).
  Fixing it there surfaced the identical gap in `regenerateGeneration`
  and `extendGeneration`, which call the same gate but had no field on
  their result type to carry the notice at all; fixed together, PR #131
  (merged). PR #132 (merged) recorded the sweep as complete in this file.
  None of the four PRs were manually verified in a real browser: no
  browser tool was available this session, and reaching a real
  low-balance account needs a seeded low-credit account against the
  local Supabase stack, which the session budget did not cover, same
  caveat as PR #126. Worth a manual pass next time someone has the local
  stack running with a seeded account.
  Swept once more for the same family of bug that produced PRs #123-125
  (a real error message computed somewhere and silently discarded before
  it reaches the user or the logs). Result: that vein is exhausted. Every
  `catch`/`.catch()` block across `apps/web/src` and `apps/worker/src`
  already surfaces the real message, and the `supabase.functions.invoke`
  sweep is confirmed complete. The only remaining pattern is a handful of
  `zod` `safeParse` branches that return a hardcoded "Invalid input"
  instead of `parsed.error.issues[0]?.message`, next to sibling branches
  in the same file that do extract it
  (`apps/web/src/features/generation/actions.ts:161`,
  `apps/web/src/features/dashboard/project-actions.ts:63,90`,
  `apps/web/src/features/chat/upload-actions.ts:141`,
  `apps/web/src/features/chat/audio-upload-actions.ts:109`). Deliberately
  not shipped: every schema behind these branches validates an internal
  shape (an id, a path) the app itself supplies, not raw user input, so a
  failure here is rare and the Zod default message is unlikely to be much
  more informative than the generic one. Real inconsistency, thin payoff;
  left alone rather than shipped as a bug fix it is not.
  Four PRs merged (#129, #130, #131, #132), zero left in flight, stopped
  here rather than manufacture a fifth unit from the thin Zod-message
  finding. Next session: the remaining "Open, safe to work" items are
  either owner-blocked already, need a new dependency (observability,
  rate limiting), or were thoroughly re-checked this session or a recent
  one with nothing found (pagination, upsell surfaces, UI/UX standing
  pass). The Zod-message consistency nit above is a legitimate pick if a
  future session wants one more small, mechanical fix, but is genuinely
  low value. Otherwise this is a good point for a fresh look at the app
  in a real browser (UI/UX pass, or verifying the four low-balance-notice
  PRs actually render as intended) if a browser tool is available, since
  none of the recent sessions have had one.

- **2026-08-25, sixth scheduled session.** No browser or computer-use tool
  available again this session; checked whether that could be worked around
  since the environment has Playwright and Chromium pre-installed (`/opt
/pw-browsers`), but there is no Docker daemon reachable here
  (`docker ps` fails to connect), so the local Supabase stack (and with it
  any authenticated UI walkthrough) is not reachable from this environment
  at all this time, not merely a missing tool. Worth checking again fresh
  each session rather than assuming, since prior sessions reported this
  differently (a working `computer`/browser pane, then an unresponsive one,
  then none at all): whatever provides it seems to vary session to session,
  not something this repo controls.

  Also installed Deno v2.4.0 locally (matching CI's `deno-version: v2.x`)
  specifically so `deno check`/`deno lint` against
  `supabase/functions/*/index.ts` could be run and independently verified
  before every push this session, the same commands
  `.github/workflows/edge-functions.yml` runs, rather than relying on CI
  alone to catch a Deno-side type error. Worth a future session doing the
  same rather than skipping local edge-function verification for lack of
  the toolchain; the install is a two-line `curl | sh` and took under a
  minute.

  With UI work off the table again, worked a code-quality and correctness
  sweep instead: three rounds of a background research agent searching
  progressively more obscure corners of the codebase for genuine,
  mechanically-verifiable bugs (not UI-shaped, not needing a new dependency,
  not touching auth/RLS/pricing), each finding verified by hand before
  shipping. Five PRs, all merged same-session after CI went green on each:
  #134, #135, #136, #137, #138 — full detail in the "Type-safety and
  correctness sweep, 2026-08-25" entry above. The last scan (a third,
  deliberately-deeper pass covering `packages/mail`, every `api/cron` and
  `api/v1` route, worker queue config, and `extend-video`/`generate-avatar`
  compared line-by-line against `generate-video`) found one real bug (the
  extend-gate model mismatch, PR #138) and then reported the rest of the
  codebase as "solid, deliberately defensive, and consistent" with nothing
  further worth shipping — a strong, credible signal that this particular
  vein (silent bugs findable by reading, no UI needed) is now close to
  exhausted, not merely unlucky on one pass.

  Zero PRs left in flight; stopped here rather than run a fourth scan
  chasing diminishing returns. Next session: the remaining "Open, safe to
  work" items are unchanged from the fifth session's assessment (owner-
  blocked, need a new dependency, or already thoroughly re-checked); the
  Zod-message consistency nit is still open and still low value. The best
  use of a future session is either (a) a real browser/UI pass, the moment
  a session actually has one, to walk the app fresh and specifically to
  verify the low-balance-notice PRs (#126, #129, #131) render as intended,
  since none of the last four sessions have had a working browser tool, or
  (b) accepting that the easy mechanical-bug vein is thin now and shifting
  to a genuinely designed unit of work (CSP nonce, if the owner has since
  weighed in; brief/script flow unification; or a scoped idempotency-key
  design for `generate-video`'s start path, flagged this session as too
  large to build blind in one unattended unit since it touches the
  credit-charging path across three call sites and needs a migration).
