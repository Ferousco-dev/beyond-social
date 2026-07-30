# The local stack

Everything except the third-party AI providers now runs on your machine:
Postgres with pgvector, Auth, Storage, the REST layer, the edge runtime, and a
mail catcher. Nothing here touches the hosted project.

## Prerequisites

Installed on this machine already:

| Tool | Why |
| --- | --- |
| Colima | The Docker runtime. Chosen over Docker Desktop because it installs and runs without an admin password. |
| Docker CLI | Talks to Colima. |
| Supabase CLI | Runs the stack and owns the migrations. |
| Redis | The worker's queue. |

Colima has to be running before Supabase:

```bash
colima start --cpu 4 --memory 8 --disk 60
```

## Starting it

```bash
supabase start
```

First run pulls about a dozen images and takes a while. After that it is
seconds. The CLI prints the URLs and keys; `supabase status` reprints them.

| Service | URL |
| --- | --- |
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mailpit (catches every email) | http://127.0.0.1:54324 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

`analytics` is disabled in `supabase/config.toml`. That container mounts the
host Docker socket, which a Colima-backed daemon cannot provide. It powers the
local log explorer and nothing the application uses. Hosted projects are
unaffected: that file configures the local stack only.

## Pointing the app at it

The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Rather than editing `.env.local` and having to remember to change it back, run
against local explicitly:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=$(supabase status -o env | grep ANON_KEY | cut -d= -f2- | tr -d '"') pnpm --filter @beyond-social/web dev
```

Use port 3000: `site_url` in `config.toml` points there, so auth redirects only
land correctly on that port.

## A test account

Local Auth sends real emails to Mailpit rather than to anyone. Sign up through
the app as normal, then open http://127.0.0.1:54324 and click the confirmation
link.

One already exists for convenience, created through the public signup endpoint
and confirmed directly in the database:

```
dev@localhost.test / local-dev-only-8vQ2
```

That password is a local fixture. It is worthless outside this machine, and the
database it belongs to is thrown away by `supabase db reset`.

## Migrations

The 22 migrations in `supabase/migrations/` are applied on `supabase start`. To
rebuild the database from scratch:

```bash
supabase db reset
```

Verified after a clean start: 22 migrations applied, 28 tables, **every one of
them with row level security enabled**, pgvector 0.8.2.

To write a new one:

```bash
supabase migration new describe_the_change
```

## Moving to the Pro project

The local stack is the same Postgres and the same migrations as the hosted one,
so promotion is a push rather than a port:

```bash
supabase link --project-ref <ref>
supabase db push          # applies any migrations the remote has not seen
supabase functions deploy # edge functions deploy separately
```

Two things that are not covered by `db push` and have to be done deliberately:

- **Storage buckets and their policies.** Confirm they exist on the remote with
  the same names.
- **Edge function JWT verification.** `kie-callback` is public by design and
  guarded by a secret in the URL; the other two must verify JWTs. This has been
  wrong once already, so check it after every deploy.

Before real traffic, turn on the **connection pooler** on the hosted project.
Serverless functions plus a worker plus edge functions exhaust direct Postgres
connections long before anything else in the system becomes a limit.
