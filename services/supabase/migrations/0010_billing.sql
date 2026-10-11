-- Billing: subscriptions and the events that granted credits.
--
-- Credits already exist on `profiles`; this adds the paid side. Stripe is the
-- source of truth for subscription state, so these tables are a projection of
-- it kept current by the webhook, never edited by the app directly.

create table if not exists billing_customers (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at         timestamptz not null default now()
);

create table if not exists subscriptions (
  id                     text primary key,
  user_id                uuid not null references auth.users(id) on delete cascade,
  status                 text not null,
  price_id               text not null,
  plan                   text not null,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on subscriptions (user_id);

-- Every Stripe event we have already applied. The webhook is at-least-once, so
-- this is what makes credit grants exactly-once.
create table if not exists billing_events (
  event_id   text primary key,
  type       text not null,
  created_at timestamptz not null default now()
);

alter table billing_customers enable row level security;
alter table subscriptions enable row level security;
alter table billing_events enable row level security;

create policy "subscriptions_select_own" on subscriptions
  for select using (auth.uid() = user_id);

/**
 * Applies a subscription change and grants that plan's credit allowance.
 * Returns false when the event was already applied, so a redelivered webhook
 * cannot grant credits twice.
 */
create or replace function billing_apply_subscription(
  p_event_id text,
  p_event_type text,
  p_user uuid,
  p_subscription_id text,
  p_status text,
  p_price_id text,
  p_plan text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_credits integer
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- Claim the event first; a duplicate delivery stops here.
  insert into billing_events (event_id, type) values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;
  if not found then
    return false;
  end if;

  insert into subscriptions (
    id, user_id, status, price_id, plan, current_period_end, cancel_at_period_end, updated_at
  )
  values (
    p_subscription_id, p_user, p_status, p_price_id, p_plan,
    p_period_end, p_cancel_at_period_end, now()
  )
  on conflict (id) do update set
    status = excluded.status,
    price_id = excluded.price_id,
    plan = excluded.plan,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now();

  -- An active subscription sets the allowance and starts a fresh period.
  if p_status in ('active', 'trialing') then
    update profiles
    set plan = p_plan,
        credits_total = p_credits,
        credits_used = 0,
        credits_period_start = now()
    where id = p_user;

    insert into credit_ledger (user_id, delta, reason)
    values (p_user, p_credits, 'subscription:' || p_plan);
  elsif p_status in ('canceled', 'unpaid', 'incomplete_expired') then
    -- Losing the subscription drops the allowance back to the free tier.
    update profiles set plan = 'free', credits_total = 15 where id = p_user;
  end if;

  return true;
end; $$;

create or replace function billing_link_customer(p_user uuid, p_customer text)
returns void language sql security definer set search_path = public as $$
  insert into billing_customers (user_id, stripe_customer_id)
  values (p_user, p_customer)
  on conflict (user_id) do update set stripe_customer_id = excluded.stripe_customer_id;
$$;

revoke all on function billing_apply_subscription(text, text, uuid, text, text, text, text, timestamptz, boolean, integer) from public, anon, authenticated;
revoke all on function billing_link_customer(uuid, text) from public, anon, authenticated;
grant execute on function billing_apply_subscription(text, text, uuid, text, text, text, text, timestamptz, boolean, integer) to service_role;
grant execute on function billing_link_customer(uuid, text) to service_role;
