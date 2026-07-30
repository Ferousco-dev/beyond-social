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
   supabase functions deploy generate-video poll-generation kie-callback
   ```

   `generate-video` and `poll-generation` verify the caller's JWT;
   `kie-callback` is public and authenticates the shared secret in constant time.
   The callback URL is derived as
   `${SUPABASE_URL}/functions/v1/kie-callback?token=${KIE_CALLBACK_SECRET}`.

3. **Check the JWT setting after every deploy.** This has been wrong once
   already: all three functions were deployed with `--no-verify-jwt`, which left
   two authenticated endpoints open to anyone who knew the URL. Nothing about a
   successful deploy shows it, which is why it needs checking rather than
   remembering.

   ```bash
   supabase functions list
   ```

   Expected: `generate-video` and `poll-generation` verify JWTs,
   `kie-callback` does not. The intended state is declared in
   `supabase/config.toml`, so that file is the answer, not memory.

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

## 3. Worker + Redis (publishing)

1. Start Redis: `docker compose up -d` (config in `docker-compose.yml`,
   `noeviction` policy as BullMQ requires).

2. Set `apps/worker/.env` (turns `isQueueConfigured` on):

   ```
   REDIS_URL=redis://127.0.0.1:6379
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   UPLOAD_POST_API_KEY=...
   ```

3. Run the worker (`pnpm --filter @beyond-social/worker dev`). The scheduler
   claims due posts every 30s via `claim_due_posts` (`for update skip locked`)
   and enqueues them; the worker publishes with retry/backoff and records
   `external_id`. The provider call in `apps/worker/src/lib/publish.ts` fails
   closed until Upload-post (or Blotato) is wired.

## 4. Verify

- `GET /api/health` returns liveness; `GET /api/ready` checks Supabase
  reachability (503 when degraded).
- Start a generation from a conversation: it should insert a
  `video_generations` row, and on completion the callback persists the render to
  the `renders` bucket and charges exactly one credit (idempotent via
  `complete_generation`).

See `docs/production-readiness.md` for the remaining hardening backlog (Upstash
rate limiting, nonce-based CSP, connection pooler, header-based webhook secret).
