-- Connected social accounts.
--
-- Publishing goes direct to each platform's API rather than through an
-- aggregator, so we hold the user's OAuth tokens. That makes this the most
-- sensitive table in the database and it is locked down accordingly:
--
--   * RLS is on and there is NO policy of any kind for `authenticated`. RLS
--     denies by default, so a client reading this table through PostgREST gets
--     nothing back, including for its own rows. A token in a browser is a token
--     that can leak through an extension, a screenshot, or an XSS bug.
--   * The owner-visible surface is `social_connections_public`, a security
--     definer view that strips the secrets and scopes rows to `auth.uid()`
--     itself. It is deliberately NOT security_invoker: an invoker view would
--     need a select policy on the base table, and that policy would also expose
--     the token columns to a direct PostgREST query.
--   * Only the service role (worker and server actions) touches the tokens.
--
-- Tokens are stored as text rather than encrypted at rest. RLS keeps them out
-- of client reach, but a dump of this table is a full compromise; moving the
-- secrets into Supabase Vault is the natural hardening step and needs no schema
-- change beyond swapping these columns for vault references.

create table if not exists public.social_connections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  platform            public.social_platform not null,
  -- The account as the platform knows it, so the UI can show which account is
  -- connected when a user has several.
  external_account_id text not null,
  account_name        text not null default '',
  access_token        text not null,
  refresh_token       text,
  -- Null when the platform issues non-expiring tokens.
  expires_at          timestamptz,
  scopes              text[] not null default '{}',
  -- Set when a refresh fails or the user revokes access, so the publish worker
  -- can fail with a reconnect message instead of a raw 401.
  revoked_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One connection per platform per user. Reconnecting updates in place, which is
-- what makes the OAuth callback idempotent.
create unique index if not exists social_connections_user_platform_idx
  on public.social_connections (user_id, platform);

-- The refresh sweep looks for tokens expiring soon.
create index if not exists social_connections_expiring_idx
  on public.social_connections (expires_at)
  where revoked_at is null and expires_at is not null;

alter table public.social_connections enable row level security;

create or replace function public.touch_social_connection()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists social_connections_touch on public.social_connections;
create trigger social_connections_touch
  before update on public.social_connections
  for each row execute function public.touch_social_connection();

-- What the settings UI is allowed to see: enough to render connection state,
-- nothing that could publish on the user's behalf. Security definer, so it
-- reads the base table without a policy, and it does its own owner scoping.
create or replace view public.social_connections_public
with (security_invoker = false) as
  select
    id,
    platform,
    account_name,
    external_account_id,
    revoked_at is null and (expires_at is null or expires_at > now()) as active,
    revoked_at,
    expires_at,
    created_at
  from public.social_connections
  where user_id = auth.uid();

-- anon is excluded: a signed-out caller has no auth.uid() and must not probe.
grant select on public.social_connections_public to authenticated;

-- Disconnecting is a privileged write, not a client one: an update policy on
-- the base table would let a user overwrite their own access_token with an
-- arbitrary value. The disconnect server action uses the service role instead.
create or replace function public.social_connection_revoke(p_platform public.social_platform)
returns void
language sql
security definer
set search_path = public
as $$
  update public.social_connections
     set revoked_at = now(),
         access_token = '',
         refresh_token = null
   where user_id = auth.uid()
     and platform = p_platform;
$$;

-- Clearing the tokens on revoke means a disconnected account cannot be used
-- even if a stale row is read later.
grant execute on function public.social_connection_revoke(public.social_platform) to authenticated;
