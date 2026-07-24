# Supabase

Local Supabase project for Beyond Social: authentication, Postgres, and storage.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for the local stack)

## Getting started

```bash
supabase start          # boot the local stack (Postgres, Auth, Studio)
supabase db reset       # apply migrations from ./migrations
```

`supabase start` prints the local API URL and anon key. Copy them into
`apps/web/.env`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
```

## Migrations

Schema changes live in [`migrations/`](migrations) and are applied in filename
order. Create a new one with:

```bash
supabase migration new <name>
```

- `0001_init_auth.sql` — `profiles`, RLS, roles, and new-user provisioning.
- `0002_app_schema.sql` — projects, messages, assets, `video_generations`,
  `scheduled_posts`, and a `credit_ledger`, all owner-scoped with indexes.
- `0003_generation_functions.sql` — service-role functions that complete/fail a
  generation and charge credits atomically (`complete_generation`,
  `fail_generation`, `reset_due_credits`).
- `0004_storage.sql` — the private `uploads` bucket with per-user policies.

## Edge functions (video generation via kie.ai)

`generate-video` starts a [kie.ai](https://kie.ai) Veo task for the signed-in
user (after a credit check) and records it. `kie-callback` is the webhook kie.ai
calls on completion; it finalizes the row and charges one credit.

```bash
cp functions/.env.example functions/.env    # add KIE_API_KEY and KIE_CALLBACK_SECRET
supabase functions serve --env-file functions/.env
```

Locally, kie.ai needs a public URL to reach `kie-callback`. Either expose it with
a tunnel (e.g. `ngrok http 54321`) and set `SUPABASE_URL` to the tunnel origin,
or skip the webhook and let the app poll `record-info` (see
`apps/web/src/features/generation`).

## Auth configuration

Email confirmations, refresh-token rotation, and TOTP MFA are enabled in
[`config.toml`](config.toml). Update `site_url` and `additional_redirect_urls`
for each deployment environment.
