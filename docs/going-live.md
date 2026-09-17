# Going Live

The backend is built and committed but runs in a guarded, inert mode until real
credentials exist. With no Supabase or Redis configured, the web app and worker
still build and run on placeholder data (`isSupabaseConfigured` /
`isQueueConfigured` are both false). This runbook flips each piece on.

Nothing here changes application code: every step is configuration plus running
the migrations and functions that already live in the repo.

## 1. Supabase project

1. Create a project, then apply the schema:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   This runs `supabase/migrations/0001`–`0006`: auth profiles, the app schema
   (projects, messages, assets, video generations, scheduled posts, credit
   ledger), the `SECURITY DEFINER` credit/publish functions, and the `uploads`
   (private) and `renders` (public) storage buckets. All tables are RLS
   owner-scoped; the privileged functions are granted to `service_role` only.

2. Set the web env (`.env.local` in `apps/web`), which turns
   `isSupabaseConfigured` on:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

## 2. Edge functions (kie.ai)

1. Set function secrets:

   ```bash
   supabase secrets set KIE_API_KEY=... KIE_CALLBACK_SECRET=<random-string>
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

2. Deploy:

   ```bash
   supabase functions deploy generate-video poll-generation kie-callback reconcile-generations
   ```

   `generate-video` and `poll-generation` verify the caller's JWT;
   `kie-callback` is public and authenticates the caller itself.

   Preferred: set `KIE_WEBHOOK_HMAC_KEY` to the `webhookHmacKey` generated on
   the kie.ai settings page. The callback then carries no secret at all, and is
   authenticated from the `X-Webhook-Signature` header, a base64 HMAC-SHA256 of
   `taskId + "." + timestampSeconds`, compared in constant time and rejected
   outside a five minute window.

   Until that key is set, the older scheme still applies: the callback URL is
   derived as `${SUPABASE_URL}/functions/v1/kie-callback?token=${KIE_CALLBACK_SECRET}`
   and the token is checked in constant time. That secret travels in the URL,
   so it reaches kie.ai's request logs and any proxy in between; setting the
   HMAC key is what stops that, and it switches over with no code change.
   `reconcile-generations` is triggered by `/api/cron/reconcile-generations`
   (Vercel Cron, see `apps/web/vercel.json`) and authenticates the request by
   comparing its Authorization header against `SUPABASE_SERVICE_ROLE_KEY`,
   which both sides already have; no separate secret to set.

3. **Check the JWT setting after every deploy.** This has been wrong once
   already: all three functions were deployed with `--no-verify-jwt`, which left
   two authenticated endpoints open to anyone who knew the URL. Nothing about a
   successful deploy shows it, which is why it needs checking rather than
   remembering.

   ```bash
   supabase functions list
   ```

   Expected: `generate-video` and `poll-generation` verify JWTs,
   `kie-callback` and `reconcile-generations` do not. The intended state is
   declared in `supabase/config.toml`, so that file is the answer, not memory.

4. For local development without a public webhook, run
   `supabase functions serve --env-file supabase/functions/.env` and rely on
   `poll-generation` (or expose the callback with a tunnel). See
   `supabase/README.md`.

5. Connection pooling is **not** required for this stack, contrary to C2 in
   [production-readiness.md](production-readiness.md), which predates the current
   data access layer. Every query goes through supabase-js to PostgREST over
   HTTP; nothing opens a Postgres socket, so there are no client connections to
   pool. Revisit the moment anything adds a direct client such as Prisma,
   Drizzle or `pg`.

## 3. Publishing worker (Redis + platform credentials)

The scheduler claims due posts every 30s with `claim_due_posts`
(`for update skip locked`) and enqueues them; the worker uploads to the
platform and records the `external_id`. **The platform adapters are real**:
`apps/worker/src/lib/platforms/` holds TikTok, Instagram, Facebook and YouTube.
Nothing here is a stub waiting on a reseller.

Without `REDIS_URL` the queue disables itself and logs a warning
(`apps/worker/src/index.ts`), so scheduled posts are accepted and never sent.

1. **Redis.** Managed, with `noeviction`, which BullMQ requires: a queue that
   evicts under pressure loses jobs silently. Upstash and Fly both do.

2. **Deploy the worker**, from the repo root because the Dockerfile copies
   workspace packages above its directory:

   ```
   fly deploy --config apps/worker/fly.toml --dockerfile apps/worker/Dockerfile
   ```

3. **Secrets.** All of them, never in `fly.toml`:

   ```
   fly secrets set REDIS_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
     TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... \
     META_APP_ID=... META_APP_SECRET=... \
     GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
     --config apps/worker/fly.toml
   ```

4. **The same platform credentials go on Vercel**, because connecting an account
   happens in the app and publishing happens in the worker. Both halves read
   them, so a credential set in one place and not the other connects an account
   that can never post.

Each platform needs its own app review before it will accept a real upload, and
they do not arrive on the same day. `/api/social/*/callback` is the redirect to
register, and it contains the domain, so it is re-pasted when the domain moves.
See [oauth.md](oauth.md) for which redirects change and which do not.

## 4. Render worker (export)

The editor queues an export into `project_renders`; this worker is what turns it
into a file. Without it running, every export sits at "Queued" until the button
gives up after ten minutes. It is a separate service from the publish worker
above because joining video is minutes of CPU and hundreds of megabytes of disk,
neither of which belongs in a request.

It needs no system ffmpeg. The binary ships inside `ffmpeg-static`, so any host
that runs Node will do, and the image is a plain `node:22-slim`.

1. In the Render dashboard: **New > Blueprint**, connect this repo, point it
   at `services/render/render.yaml`. Render reads the Dockerfile, build
   context, plan, and health check path from that file — nothing to
   configure by hand beyond the two secrets below.

2. Render prompts for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` at
   blueprint creation (declared `sync: false` in `render.yaml`, so they are
   never committed). The service role key is what lets it claim rows and
   write to the `renders` bucket.

3. Confirm it is up. `GET /health` returns `{"status":"ok"}` while the loop is
   turning and 503 once a shutdown has started, so a rolling deploy drains
   rather than dropping a job halfway.

Region is `frankfurt`, the closest Render offers to the Supabase project
(Stockholm): the worker streams every source clip down and the finished file
back up, so the distance is paid on every export rather than once. Plan is
`starter`, Render's cheapest tier that doesn't scale to zero — `free` spins
down on inactivity, and a stopped instance claims nothing, so an export queued
while it slept would sit there until something else woke it.

Any container host works, not just Render. The Dockerfile is standard and the
service takes `PORT` from the environment.

## 5. Payments (Stripe)

Nothing here is half built: checkout sessions, the billing portal and the
webhook all exist. What is missing is the account and four values.

**The one thing to get right.** `priceUsd` in `lib/billing/plans.ts` is what the
pricing page _shows_. What a card is actually _charged_ is the Stripe price the
id points at. They are separate facts kept equal by hand, and a page that
advertises $79 while billing $229 is the worst failure this product can have.

`pnpm --filter @beyond-social/web test:stripe` compares them against the live
account and fails if they disagree. It skips when Stripe is unconfigured, so it
is safe to run at any time. **Run it after creating the prices.**

1. Create two recurring USD products in Stripe, monthly, matching the catalogue:

   | Plan    | Monthly  | Yearly |
   | ------- | -------- | ------ |
   | Creator | **$79**  | $790   |
   | Studio  | **$229** | $2290  |

2. Set on Vercel, all four:

   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_CREATOR=price_...
   STRIPE_PRICE_STUDIO=price_...
   ```

3. Point the Stripe webhook at `/api/billing/webhook` and subscribe to the
   subscription events. The handler is idempotent by event id: 0080 and 0081
   exist because Stripe fires `created` and `updated` for one checkout, and
   without that guard one signup granted three months of credits.

4. Run the check:

   ```
   pnpm --filter @beyond-social/web test:stripe
   ```

Credit packs are priced in `features/billing/credit-packs.ts` on the same
footing, and the saving badges compute themselves from those numbers rather than
being written down twice.

## 6. HeyGen (trained avatars)

Two secrets on Supabase, not Vercel, because only the edge functions call HeyGen:

```
npx supabase secrets set HEYGEN_API_KEY=... HEYGEN_CREDIT_COST=10 CRON_SECRET=<random-string>
```

`CRON_SECRET` is shared with the app server (`CRON_SECRET` on Vercel) and with
Vault (`heygen_cron_secret`); it is what authenticates the pollers. Polling
runs on Supabase Cron (migration `0108`, training every 3 min, videos every
2 min), with the Vercel `/api/cron/poll-heygen` route as fallback. Full
schedule, secrets, manual trigger and troubleshooting: [heygen-polling.md](heygen-polling.md).

`HEYGEN_CREDIT_COST` is the gate. Unset, `generate-heygen-avatar` refuses with
`unpriced` before touching the provider, so no spend is possible. Ten credits is
a thirty second video at HeyGen's standard $1 per minute. **It is right for
thirty seconds only**: if twin videos are ever allowed to run longer, a flat
cost stops being true and a three minute render costs $3.00 and still earns ten
credits.

Pay as you go is enough. HeyGen's API pricing page lists Digital Twin creation
as enterprise only and its help centre says otherwise; the API settles it, and
`POST /v3/avatars` with `type: digital_twin` is accepted on a pay as you go key.
See [generation-wiring-audit.md](generation-wiring-audit.md).

The account needs credit. Without it every render fails at the provider, and the
reservation is refunded by `fail_generation_by_id`, so nobody loses credits;
they just get no video.

## 7. Verify

Run these in order. Each one fails loudly rather than degrading, so a pass is
worth something.

```
pnpm --filter @beyond-social/web test:stripe   # page price == stripe price
pnpm --filter @beyond-social/web test:model    # every model routes correctly
deno run --allow-read supabase/functions/_shared/kie-models.test.ts
```

- `GET /api/health` returns liveness; `GET /api/ready` checks Supabase
  reachability (503 when degraded).
- `GET /health` on the publish worker (Fly) and the render worker (Render). A
  worker that is up but has no `REDIS_URL` still answers, and logs that the
  queue is disabled, so check the log rather than only the status code.
- Start a generation from a conversation: it should insert a
  `video_generations` row, and on completion the callback persists the render to
  the `renders` bucket and charges exactly one credit (idempotent via
  `complete_generation`).

See `docs/production-readiness.md` for the remaining hardening backlog (Upstash
rate limiting, nonce-based CSP, connection pooler, header-based webhook secret).
