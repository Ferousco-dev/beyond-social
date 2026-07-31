-- User-registered webhook endpoints.
--
-- The secret is the reason this table is shaped the way it is. It is generated
-- once, shown to the user once, and stored only as a SHA-256 digest plus the
-- last four characters, exactly like `api_keys`. A database dump therefore
-- yields nothing that can sign a payload, and we genuinely cannot show the
-- secret again: rotation is the only recovery path, which is the honest
-- behaviour rather than a convenience we would have to break later.
--
-- `secret_hash` is revoked from clients at the column level below. RLS already
-- limits a user to their own rows, but there is no reason for a browser to
-- receive even the digest of a signing key, and a hash that never crosses the
-- wire cannot be captured from one.
--
-- Delivery is not built. `last_delivery_at` and `failure_count` exist so the
-- sender has somewhere to write when it ships, and stay null and 0 until then.

create table if not exists public.user_webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  events text[] not null,
  secret_hash text not null,
  secret_last_four text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_delivery_at timestamptz,
  failure_count integer not null default 0,

  -- https only. The application layer additionally rejects loopback, private
  -- and link-local hosts (see apps/web/src/lib/webhooks/url.ts), which needs
  -- URL parsing this check cannot do. This is the floor, not the whole guard.
  constraint user_webhooks_url_https check (url like 'https://%'),
  constraint user_webhooks_url_length check (length(url) between 12 and 2048),

  -- An endpoint subscribed to nothing is a delivery bug waiting to be filed.
  -- `cardinality`, not `array_length`: the latter returns NULL for an empty
  -- array, and a CHECK that evaluates to NULL passes, so `array_length(events,
  -- 1) >= 1` accepts exactly the value it is meant to reject.
  constraint user_webhooks_events_present check (cardinality(events) >= 1),
  constraint user_webhooks_events_known check (
    events <@ array[
      'generation.completed',
      'generation.failed',
      'post.published',
      'post.failed'
    ]::text[]
  ),

  constraint user_webhooks_secret_last_four check (length(secret_last_four) = 4),
  constraint user_webhooks_failure_count check (failure_count >= 0)
);

-- The user's own list, newest first.
create index if not exists user_webhooks_user_created_idx
  on public.user_webhooks (user_id, created_at desc);

-- The sender's lookup when it ships: active endpoints subscribed to an event.
create index if not exists user_webhooks_active_events_idx
  on public.user_webhooks using gin (events)
  where is_active;

-- One endpoint per URL per user. Registering the same URL twice produces two
-- deliveries of everything, which reads as a platform bug from the outside.
create unique index if not exists user_webhooks_user_url_idx
  on public.user_webhooks (user_id, url);

alter table public.user_webhooks enable row level security;

drop policy if exists "Owners read their webhooks" on public.user_webhooks;
create policy "Owners read their webhooks" on public.user_webhooks
  for select using (auth.uid() = user_id);

drop policy if exists "Active owners create their webhooks" on public.user_webhooks;
create policy "Active owners create their webhooks" on public.user_webhooks
  for insert with check (auth.uid() = user_id and not public.is_suspended());

drop policy if exists "Active owners update their webhooks" on public.user_webhooks;
create policy "Active owners update their webhooks" on public.user_webhooks
  for update using (auth.uid() = user_id and not public.is_suspended())
  with check (auth.uid() = user_id and not public.is_suspended());

drop policy if exists "Owners delete their webhooks" on public.user_webhooks;
create policy "Owners delete their webhooks" on public.user_webhooks
  for delete using (auth.uid() = user_id);

drop trigger if exists reject_suspended_owner on public.user_webhooks;
create trigger reject_suspended_owner
  before insert on public.user_webhooks
  for each row execute function public.reject_suspended_owner();

-- The signing key never leaves the server, not even as a digest.
--
-- This has to be a table-level revoke followed by a column-level grant, not a
-- column-level revoke: in PostgreSQL a table-wide SELECT covers every column,
-- and a later `revoke select (col)` against it does nothing at all. Supabase's
-- default privileges hand `authenticated` that table-wide grant, so the only
-- way to withhold one column is to take the whole grant back and re-issue it
-- column by column. A consequence worth knowing: `select *` as `authenticated`
-- now fails rather than silently omitting the column, so reads must name their
-- columns. That is the intended failure mode.
revoke select on public.user_webhooks from authenticated, anon;
grant select (
  id, user_id, url, events, secret_last_four, is_active,
  created_at, last_delivery_at, failure_count
) on public.user_webhooks to authenticated;

-- ---------------------------------------------------------------------------
-- Per-user cap
-- ---------------------------------------------------------------------------
-- Each endpoint multiplies outbound requests per event. A user with a thousand
-- of them is not a use case, it is an amplifier pointed at someone else.
create or replace function public.enforce_webhook_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  existing integer;
begin
  select count(*) into existing from public.user_webhooks where user_id = new.user_id;
  if existing >= 10 then
    raise exception 'webhook limit reached' using errcode = 'check_violation';
  end if;
  return new;
end; $$;

drop trigger if exists user_webhooks_limit on public.user_webhooks;
create trigger user_webhooks_limit
  before insert on public.user_webhooks
  for each row execute function public.enforce_webhook_limit();
