-- Carrying an avatar recording from the desktop to the phone in the room.
--
-- A laptop webcam is usually a 720p sensor angled up at somebody under a
-- ceiling light. The phone beside it has a better camera and a microphone
-- closer to the mouth, and this footage becomes a permanent likeness, so the
-- difference outlives the recording.
--
-- The link that carries it is a capability: whoever holds it may attach footage
-- to one person's avatar, from a device with no session on it. That shapes
-- every decision here.
--
--   Hashed, not stored.   The row keeps a SHA-256 of the token, the way an API
--                         key would be kept. A leaked backup then hands out
--                         nothing usable, because the secret only ever exists
--                         in the QR code and the URL bar.
--   Short-lived.          Twenty minutes: long enough to walk to better light,
--                         short enough that a photograph of the QR is worthless
--                         tomorrow.
--   Single use.           Claimed on first upload. A capability that can be
--                         replayed is one a shoulder-surfer keeps.
--   Never client-trusted.  Validation, claiming and the storage prefix are all
--                         decided by the definer functions below, so the phone
--                         supplies a token and nothing else.

create table if not exists public.avatar_handoffs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- The hash, never the token. 64 hex characters of SHA-256.
  token_hash  text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at  timestamptz not null,
  claimed_at  timestamptz,
  -- Where the phone's upload landed, once it has.
  storage_path text,
  created_at  timestamptz not null default now()
);

-- Every lookup is by hash, and only live rows are ever interesting.
create index if not exists avatar_handoffs_live_idx
  on public.avatar_handoffs (token_hash)
  where claimed_at is null;

create index if not exists avatar_handoffs_user_idx
  on public.avatar_handoffs (user_id, created_at desc);

alter table public.avatar_handoffs enable row level security;

-- Owners may see their own handoffs, which is what lets the desktop screen show
-- that a phone has finished. Nobody writes through the client: minting and
-- claiming both go through the definer functions.
drop policy if exists "avatar_handoffs_select_own" on public.avatar_handoffs;
create policy "avatar_handoffs_select_own" on public.avatar_handoffs
  for select using (auth.uid() = user_id);

/*
 * Mints a handoff for the calling user.
 *
 * Takes the hash rather than the token: the token is generated in the server
 * action and never reaches Postgres, so it cannot appear in a query log.
 *
 * Any older unclaimed handoff for this user is expired on the way through.
 * Pressing "refresh now" has to invalidate the code that was on screen a moment
 * ago, or the old QR keeps working and the expiry means nothing.
 */
create or replace function public.mint_avatar_handoff(p_token_hash text, p_minutes integer)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 60 then
    raise exception 'Handoff lifetime out of range';
  end if;

  update public.avatar_handoffs
     set expires_at = now()
   where user_id = auth.uid() and claimed_at is null and expires_at > now();

  v_expires := now() + make_interval(mins => p_minutes);
  insert into public.avatar_handoffs (user_id, token_hash, expires_at)
  values (auth.uid(), p_token_hash, v_expires);

  return v_expires;
end;
$$;

/*
 * Resolves a token to the user it was minted for, or nothing.
 *
 * Read-only and deliberately silent about why a token failed: expired, claimed
 * and never-existed all return no rows, because telling an unauthenticated
 * caller which of those it was is telling them whether a token exists.
 */
create or replace function public.resolve_avatar_handoff(p_token_hash text)
returns table (user_id uuid) language sql stable security definer set search_path = public as $$
  select h.user_id
  from public.avatar_handoffs h
  where h.token_hash = p_token_hash
    and h.claimed_at is null
    and h.expires_at > now();
$$;

/*
 * Claims a handoff against the object the phone uploaded.
 *
 * The same `claimed_at is null` test that resolves it also claims it, in one
 * statement, so two phones racing the same QR cannot both succeed: the second
 * update matches no rows and is told the link is spent.
 */
create or replace function public.claim_avatar_handoff(p_token_hash text, p_path text)
returns table (user_id uuid) language sql volatile security definer set search_path = public as $$
  update public.avatar_handoffs
     set claimed_at = now(), storage_path = p_path
   where token_hash = p_token_hash
     and claimed_at is null
     and expires_at > now()
  returning avatar_handoffs.user_id;
$$;

revoke all on function public.mint_avatar_handoff(text, integer) from public, anon;
revoke all on function public.resolve_avatar_handoff(text) from public, anon, authenticated;
revoke all on function public.claim_avatar_handoff(text, text) from public, anon, authenticated;
grant execute on function public.mint_avatar_handoff(text, integer) to authenticated;
-- Resolving and claiming happen on behalf of a device with no session, so only
-- the server role may do them, never the browser.
grant execute on function public.resolve_avatar_handoff(text) to service_role;
grant execute on function public.claim_avatar_handoff(text, text) to service_role;
