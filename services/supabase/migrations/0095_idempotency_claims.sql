-- One submitted turn, one turn.
--
-- A chat turn writes two messages, makes four or five model calls, and can
-- start a paid render. It is delivered over SSE, and a disconnected SSE request
-- still completes on the server: the route says so itself, it keeps the turn
-- running so the render that was already started still lands. The client then
-- falls back to the server action with the same payload, which runs the whole
-- thing again. Two messages become four, and one render becomes two renders and
-- two charges.
--
-- Nothing in that path was wrong on its own. The fallback exists because the
-- stream can be unreachable, and keeping the turn alive after a disconnect
-- exists so a charged generation is not orphaned. Together they are a retry
-- with no key.
--
-- So the client names the attempt, and the first caller to claim that name is
-- the one that runs. The claim is taken before any provider is called, which is
-- the only ordering that helps: claiming afterwards deduplicates the record of
-- a render that has already been paid for twice.

create table if not exists public.idempotency_claims (
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Namespaces the key, so a chat turn and some later caller cannot collide on
  -- a client that reuses a request id across features.
  scope       text not null,
  key         text not null,
  claimed_at  timestamptz not null default now(),
  primary key (user_id, scope, key)
);

create index if not exists idempotency_claims_claimed_at_idx
  on public.idempotency_claims (claimed_at);

alter table public.idempotency_claims enable row level security;
-- No policy: infrastructure, reached only through the function below. A client
-- that could delete its own claims could replay any of them.

/*
 * Claims a key, or reports that somebody already has it.
 *
 * `on conflict do nothing` plus `returning` is the whole mechanism: the insert
 * either lands or it does not, in one statement, so two requests arriving
 * together cannot both be told they are first. A read followed by an insert is
 * the version of this that does not work.
 *
 * A claim older than the window is reclaimable. A turn that died between
 * claiming and finishing would otherwise make that exact prompt unresendable
 * forever, and the client generates a fresh key per submit anyway, so the only
 * thing this window has to outlast is one turn.
 */
create or replace function public.claim_idempotency_key(
  p_scope text,
  p_key text,
  p_stale_after interval default interval '10 minutes'
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := auth.uid();
  v_claimed boolean;
begin
  if v_user is null then
    return false;
  end if;

  delete from public.idempotency_claims
    where user_id = v_user and scope = p_scope and key = p_key
      and claimed_at < now() - p_stale_after;

  insert into public.idempotency_claims (user_id, scope, key)
  values (v_user, p_scope, p_key)
  on conflict (user_id, scope, key) do nothing
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end; $$;

/** Drops claims that can no longer be replayed, so the table does not grow. */
create or replace function public.prune_idempotency_claims()
returns bigint
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_removed bigint;
begin
  delete from public.idempotency_claims where claimed_at < now() - interval '24 hours';
  get diagnostics v_removed = row_count;
  return v_removed;
end; $$;

revoke all on function public.claim_idempotency_key(text, text, interval) from public, anon;
revoke all on function public.prune_idempotency_claims() from public, anon, authenticated;
-- Callable by a signed-in user: it reads `auth.uid()` itself, so a caller can
-- only ever claim within their own namespace.
grant execute on function public.claim_idempotency_key(text, text, interval) to authenticated, service_role;
grant execute on function public.prune_idempotency_claims() to service_role;

comment on function public.claim_idempotency_key(text, text, interval) is
  'Claims a caller-supplied key for the current user. Returns false when the key is already claimed, which means the work has already been started.';
