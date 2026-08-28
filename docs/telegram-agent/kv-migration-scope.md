# KV migration scope

`services/telegram-agent/README.md` ("Evolving past V1") flags two gaps that
only real storage fixes: no idempotency key for retried Telegram updates, and
follow-up correlation that depends entirely on the user replying to the right
message. This documents what a store would actually hold, which store to use,
and a rollout that doesn't require a rewrite. No code changes in this task —
this is scoping only, since it touches a new database table and new
production env vars and should get an explicit go-ahead first.

## What's already solved without one

Cross-task memory (a fresh Claude session picking up context from earlier
tasks) is handled by `docs/telegram-agent/JOURNAL.md`, and the one concrete
reply-correlation bug (replying to the "still running" message silently
starting an unrelated task) was fixed by giving that message a footer too.
Neither needed storage. See the 2026-08-28 entries in `JOURNAL.md`.

## What's still fragile without one

1. **Update retries can double-dispatch.** A slow or failed webhook response
   makes Telegram retry the same update. Nothing currently recognizes "I've
   already handled this `update_id`", so a retry can fire a second
   `repository_dispatch` for the same message.
2. **Follow-up correlation only exists inside Telegram's own reply chain.**
   If the user sends a plain follow-up instead of using "Reply", or Telegram
   drops the `reply_to_message` payload (long threads, forwarded messages),
   the bot has no way to know a task is already in flight for that chat.
3. **`/status` and `/cancel` only see GitHub Actions' own view.** They work,
   but can't answer chat-scoped questions like "what did I last ask for in
   this chat" without re-deriving it from workflow run names.

None of these are urgent — the README already calls the current gap
"acceptable for V1 given how rare that is" — but they're the concrete
work behind "give the bot memory," as opposed to a vaguer rewrite.

## Store choice: Supabase, not a new KV vendor

The project's locked stack already has a database reachable over plain HTTP:
every existing service talks to Supabase via `supabase-js` or PostgREST, with
no direct Postgres client anywhere (`docs/production-readiness.md`, C2).
`services/telegram-agent` already makes bare `requests` calls to a REST API
(`lib/github_client.py`) — hitting Supabase's PostgREST endpoint the same way
is the same amount of new code as hitting a KV vendor's REST API, without
adding Vercel KV or Upstash as a second storage vendor for one small service.
Recommendation: two tables in Supabase, not a new KV product.

### Schema sketch

```sql
create table if not exists public.telegram_tasks (
  task_id text primary key,
  chat_id bigint not null,
  session_id text,
  branch text,
  status text not null default 'dispatched',
  prompt text not null,
  parent_task_id text references public.telegram_tasks(task_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_tasks_chat_id_idx
  on public.telegram_tasks (chat_id, created_at desc);

create table if not exists public.telegram_processed_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);
```

Both are backend-only: no `anon` or `authenticated` grants, service-role key
only, same isolation pattern the codebase already uses for tables a client
should never see directly.

`telegram_processed_updates` needs periodic pruning (a cron in the same
family as `apps/web/src/app/api/cron/prune-caches`) so it doesn't grow
forever; a few days of retention is enough since Telegram doesn't retry that
far out. `telegram_tasks` can likely keep a longer retention (weeks) since
it's small and useful for `/status`.

## Rollout, in phases that each ship independently

1. **Add the tables** via a numbered migration in `supabase/migrations/`,
   service-role only, no reads/writes from the app's existing surface.
2. **Write-through, shadow mode.** `lib/tasks.py` and `github_client.py` gain
   a `lib/store.py` that inserts a row on dispatch and updates it from the
   GitHub callback handler. Nothing reads from it yet — this phase just
   proves the data is being written correctly against production traffic
   before anything depends on it.
3. **Read path with fallback.** `/status` and follow-up resolution try the
   stored row first, falling back to the existing footer-parsing /
   live-GitHub-Actions-query path if the row is missing (covers tasks
   dispatched before this migration, and covers the store being briefly
   unavailable without taking the bot down).
4. **Idempotency check.** The webhook handler checks
   `telegram_processed_updates` for the incoming `update_id` before doing
   anything else, and inserts it before returning 200. This is the only
   phase that changes user-visible behavior (duplicate updates now get
   silently dropped instead of possibly double-dispatching).
5. **Only after 3 and 4 are stable**, consider retiring footer-parsing as a
   requirement — it's cheap to keep indefinitely as a human-readable
   fallback and costs nothing to leave in place.

Each phase is a small, independently reviewable PR; nothing here requires
taking the bot offline or migrating data, since there's no existing state to
migrate.

## New environment variables

`SUPABASE_URL` and a service-role key, added as Vercel project env vars for
`services/telegram-agent` (separate from `apps/web`'s Supabase env vars,
even though it's the same project, to keep the blast radius of a leaked key
scoped to what actually needs it).

## Open questions for the owner

- Same Supabase project as the app, or a separate project? Sharing is
  simpler operationally; a separate project keeps a bot-service credential
  leak from touching user data at all. Given this bot already holds a
  GitHub token with `contents: write` on the whole repo, a shared project
  with a narrowly-scoped service role is probably proportionate, but it's
  the owner's call.
- Retention windows for both tables (suggested above: days for processed
  updates, weeks for tasks) — easy to change later, just needs a number.
- Whether phase 4 (idempotency) alone is worth doing sooner on its own,
  since it's the one item explicitly called a real gap today, independent
  of the rest of this scope.

## Effort

Phases 1-2: small, a single migration plus one new module. Phase 3: touches
`commands.py`'s read paths, still small. Phase 4: small, isolated to the
webhook entrypoint. Each is roughly the size of the recent `#153`-`#158`
telegram-agent PRs in this repo's history, not a rewrite.
