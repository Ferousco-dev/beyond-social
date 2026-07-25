-- API keys for programmatic access.
--
-- Only a hash of each key is stored. A leaked database dump must not yield
-- working credentials, and it means we genuinely cannot show a key again after
-- creation, which is the honest behaviour rather than a UX choice.

create table if not exists api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  org_id      uuid references organizations(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  -- SHA-256 of the full key, hex encoded.
  key_hash    text not null unique,
  -- Shown in the UI so a key is recognisable without being usable.
  key_prefix  text not null,
  last_used_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists api_keys_user_idx on api_keys (user_id);

alter table api_keys enable row level security;

-- Owners may see and revoke their keys. Nobody reads `key_hash` back through
-- the API; verification happens in a definer function instead.
create policy "owners read their keys" on api_keys
  for select using (auth.uid() = user_id);
create policy "owners revoke their keys" on api_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners create their keys" on api_keys
  for insert with check (auth.uid() = user_id);

/**
 * Resolves a presented key to its owner, or null. Records use so a stale key is
 * visible in the UI. Definer because the caller is unauthenticated at this
 * point: the key itself is the credential being checked.
 */
create or replace function api_key_owner(p_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  select user_id into v_user
  from api_keys
  where key_hash = p_hash and revoked_at is null;

  if v_user is null then
    return null;
  end if;

  update api_keys set last_used_at = now() where key_hash = p_hash;
  return v_user;
end; $$;

revoke all on function api_key_owner(text) from public, anon, authenticated;
grant execute on function api_key_owner(text) to service_role;
