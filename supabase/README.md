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

`0001_init_auth.sql` creates the `profiles` table, row-level security policies,
role-based access (`user_role`), and a trigger that provisions a profile row for
each new auth user.

## Auth configuration

Email confirmations, refresh-token rotation, and TOTP MFA are enabled in
[`config.toml`](config.toml). Update `site_url` and `additional_redirect_urls`
for each deployment environment.
