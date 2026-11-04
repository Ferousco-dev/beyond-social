-- Connected social accounts. Tokens are encrypted by the API before they reach
-- the database (the same sealer as provider keys), and nothing here is readable
-- from the browser.
create table public.social_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  platform      text not null check (platform in ('youtube', 'tiktok', 'instagram')),
  account_id    text not null,
  account_name  text not null default '',
  access_ct     bytea not null,
  refresh_ct    bytea,
  expires_at    timestamptz,
  scopes        text[] not null default '{}',
  -- Set when a refresh is refused or the user revokes access, so the worker
  -- fails with "reconnect" instead of a raw 401.
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- One connection per platform per user: reconnecting replaces it in place.
create unique index social_connections_user_platform_idx on public.social_connections (user_id, platform);
alter table public.social_connections enable row level security;

-- A started sign-in. The state is stored hashed and is single use, so a leaked
-- redirect cannot be replayed, and the PKCE verifier never leaves the server.
create table public.social_oauth_states (
  state_hash   bytea primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  platform     text not null,
  verifier_ct  bytea not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
create index social_oauth_states_expiry_idx on public.social_oauth_states (expires_at);
alter table public.social_oauth_states enable row level security;
