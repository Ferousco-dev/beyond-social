-- Credits and the model catalogue.
--
-- Two decisions this migration settles, because the schema had drifted into
-- disagreeing with itself:
--
-- 1. `credit_ledger` is the source of truth for what a user has.
--    `profiles.credits_total` / `credits_used` become a derived cache kept
--    current by a trigger, not a second wallet. They previously disagreed:
--    `billing_apply_subscription` reset the profile counters to a fresh
--    allowance while appending the same grant to the ledger, so the two
--    diverged permanently after the first renewal. A ledger is auditable and a
--    counter is not, so the ledger wins and the counters follow it.
--
-- 2. Credits do not expire. The monthly allowance is added, never reset, so
--    `reset_due_credits` is dropped rather than scheduled. It was never wired
--    to a scheduler, so nothing depends on it.
--
-- Price and access are separate dials: `credit_cost` says what a run costs,
-- `min_plan` says whether the plan may run it at all. Both are rows, so a
-- price change is an update, never a deploy.

-- ---------------------------------------------------------------------------
-- Ledger: idempotency key and entry kind
-- ---------------------------------------------------------------------------
alter table public.credit_ledger
  add column if not exists external_ref text,
  add column if not exists kind text not null default 'adjustment'
    check (kind in ('grant', 'debit', 'refund', 'adjustment'));

-- The idempotency key for at-least-once callers (Stripe webhooks, retried
-- generation callbacks). Null means "not idempotent", which is fine for manual
-- adjustments.
create unique index if not exists credit_ledger_external_ref_idx
  on public.credit_ledger (external_ref)
  where external_ref is not null;

-- ---------------------------------------------------------------------------
-- Cache maintenance
-- ---------------------------------------------------------------------------
create or replace function public.refresh_credit_cache(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.profiles p
  set credits_total = coalesce(l.granted, 0),
      credits_used = coalesce(l.spent, 0)
  from (
    select
      sum(delta) filter (where delta > 0) as granted,
      -sum(delta) filter (where delta < 0) as spent
    from public.credit_ledger where user_id = p_user
  ) l
  where p.id = p_user;
$$;

create or replace function public.credit_ledger_sync()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_credit_cache(coalesce(new.user_id, old.user_id));
  return null;
end; $$;

drop trigger if exists credit_ledger_sync_cache on public.credit_ledger;
create trigger credit_ledger_sync_cache
  after insert or update or delete on public.credit_ledger
  for each row execute function public.credit_ledger_sync();

-- One-time reconciliation: the profile counters are what users see today, so
-- the balance they imply is preserved and the ledger is squared up to it. The
-- split between granted and spent is rebuilt from the ledger afterwards, so
-- historic usage before this point reads as a single adjustment entry.
insert into public.credit_ledger (user_id, delta, reason, kind)
select p.id,
       (p.credits_total - p.credits_used) - coalesce(l.balance, 0),
       'ledger_reconciliation',
       'adjustment'
from public.profiles p
left join (
  select user_id, sum(delta) as balance from public.credit_ledger group by user_id
) l on l.user_id = p.id
where (p.credits_total - p.credits_used) - coalesce(l.balance, 0) <> 0;

-- Signup granted the free allowance through a column default, which left the
-- cache claiming 15 credits the ledger had never issued. The allowance is now
-- a real ledger entry and the defaults are zero, so there is no path that
-- creates credits without a record of them.
alter table public.profiles
  alter column credits_total set default 0,
  alter column credits_used set default 0;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');

  -- Keep in step with PLAN_CATALOGUE.free.credits in apps/web/src/lib/billing.
  perform public.grant_credits(new.id, 15, 'signup:free', 'signup:' || new.id);
  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- Model catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.model_catalog (
  id           text primary key,
  provider     text not null,
  name         text not null,
  family       text not null check (family in ('video', 'image', 'chat', 'audio')),
  description  text not null,
  capabilities text[] not null default '{}',
  credit_cost  integer not null check (credit_cost >= 0),
  min_plan     text not null default 'free' check (min_plan in ('free', 'creator', 'studio')),
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists model_catalog_active_idx
  on public.model_catalog (is_active, family, sort_order);

drop trigger if exists model_catalog_set_updated_at on public.model_catalog;
create trigger model_catalog_set_updated_at
  before update on public.model_catalog
  for each row execute function public.set_updated_at();

alter table public.model_catalog enable row level security;

-- The market is a shopping window: anyone may read the active rows, nobody may
-- write them from a client.
drop policy if exists "Active models are readable" on public.model_catalog;
create policy "Active models are readable" on public.model_catalog
  for select using (is_active);

-- Only the models this platform can actually call today. The kie.ai client
-- (`supabase/functions/_shared/kie.ts`) passes `model` straight through to the
-- Veo endpoint, so these three are real. `veo3_fast` is priced at 1 credit
-- because that is what the shipped `complete_generation` has always charged for
-- a video; it is the anchor the rest of the catalogue is priced against.
--
-- `veo3` and `veo3_lite` ship inactive: they are callable, but kie's per-model
-- price is not recorded anywhere in this repo, so any credit cost for them
-- would be invented. Set the real cost and flip `is_active` to list them.
insert into public.model_catalog
  (id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order)
values
  ('veo3_fast', 'kie', 'Veo 3 Fast', 'video',
   'The default generator. Fast turnaround at 720p, good for volume.',
   array['text-to-video', 'image-to-video', '720p', 'vertical'], 1, 'free', true, 10),
  ('veo3', 'kie', 'Veo 3', 'video',
   'The quality tier: slower, stronger motion and prompt adherence.',
   array['text-to-video', 'image-to-video', '1080p', 'vertical'], 0, 'studio', false, 20),
  ('veo3_lite', 'kie', 'Veo 3 Lite', 'video',
   'The cheapest tier, for drafts and iteration.',
   array['text-to-video', '720p', 'vertical'], 0, 'free', false, 30)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Access checks
-- ---------------------------------------------------------------------------
create or replace function public.plan_rank(p_plan text)
returns integer language sql immutable set search_path = '' as $$
  select case p_plan when 'studio' then 3 when 'creator' then 2 else 1 end;
$$;

create or replace function public.credit_balance()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_ledger where user_id = auth.uid();
$$;

-- The two dials, checked independently. Tier is evaluated first: it is the
-- wall a purchase cannot climb, so telling a free user to buy credits for a
-- studio model would be a lie.
create or replace function public.can_run_model(p_model text)
returns table (allowed boolean, reason text, credit_cost integer, balance integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_model public.model_catalog;
  v_plan text;
  v_balance integer;
begin
  select * into v_model from public.model_catalog where id = p_model;
  select p.plan into v_plan from public.profiles p where p.id = auth.uid();
  select coalesce(sum(l.delta), 0)::integer into v_balance
    from public.credit_ledger l where l.user_id = auth.uid();

  if v_plan is null then
    return query select false, 'not_authenticated', 0, 0;
  elsif v_model.id is null then
    return query select false, 'unknown_model', 0, v_balance;
  elsif not v_model.is_active then
    return query select false, 'model_inactive', v_model.credit_cost, v_balance;
  elsif public.plan_rank(v_plan) < public.plan_rank(v_model.min_plan) then
    return query select false, 'plan_tier', v_model.credit_cost, v_balance;
  elsif v_balance < v_model.credit_cost then
    return query select false, 'insufficient_credits', v_model.credit_cost, v_balance;
  else
    return query select true, 'ok', v_model.credit_cost, v_balance;
  end if;
end; $$;

-- ---------------------------------------------------------------------------
-- Granting
-- ---------------------------------------------------------------------------
-- Idempotent on p_external_ref: a redelivered webhook resolves to the same
-- ledger row and grants nothing further. Returns the balance either way.
create or replace function public.grant_credits(
  p_user uuid,
  p_amount integer,
  p_reason text,
  p_external_ref text default null
)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if p_amount <= 0 then
    raise exception 'grant_credits: amount must be positive, got %', p_amount;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, kind, external_ref)
  values (p_user, p_amount, p_reason, 'grant', p_external_ref)
  on conflict (external_ref) where external_ref is not null do nothing;

  return (select coalesce(sum(delta), 0)::integer
          from public.credit_ledger where user_id = p_user);
end; $$;

-- ---------------------------------------------------------------------------
-- Generation lifecycle, now priced from the catalogue
-- ---------------------------------------------------------------------------
-- Debit on success. The unique external ref is what makes a redelivered
-- callback free rather than a second charge.
create or replace function public.complete_generation(
  p_provider_task_id text,
  p_result_url text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_gen public.video_generations;
  v_cost integer;
begin
  select * into v_gen from public.video_generations
    where provider_task_id = p_provider_task_id for update;

  if not found or v_gen.status = 'ready' then
    return;
  end if;

  update public.video_generations
    set status = 'ready', result_url = p_result_url, error = null
    where id = v_gen.id;

  -- An unlisted model still ran and still costs us money, so it falls back to
  -- the base rate rather than to free.
  select coalesce(max(credit_cost), 1) into v_cost
    from public.model_catalog where id = v_gen.model;

  if v_cost > 0 then
    insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
    values (v_gen.user_id, -v_cost, 'video_generation', v_gen.id, 'debit',
            'generation:' || v_gen.id)
    on conflict (external_ref) where external_ref is not null do nothing;
  end if;
end; $$;

-- Failure charges nothing. A generation that was charged and then failed (a
-- late provider reversal) is refunded here, once.
create or replace function public.fail_generation(
  p_provider_task_id text,
  p_error text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_gen public.video_generations;
  v_debit integer;
begin
  select * into v_gen from public.video_generations
    where provider_task_id = p_provider_task_id for update;
  if not found then
    return;
  end if;

  update public.video_generations
    set status = 'failed', error = p_error
    where id = v_gen.id and status <> 'ready';

  select sum(delta) into v_debit from public.credit_ledger
    where generation_id = v_gen.id and kind = 'debit';

  if coalesce(v_debit, 0) < 0 then
    insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
    values (v_gen.user_id, -v_debit, 'video_generation_refund', v_gen.id, 'refund',
            'refund:' || v_gen.id)
    on conflict (external_ref) where external_ref is not null do nothing;
  end if;
end; $$;

-- Credits do not expire, so there is nothing to roll over.
drop function if exists public.reset_due_credits();

-- ---------------------------------------------------------------------------
-- Billing: allowance is added, not reset
-- ---------------------------------------------------------------------------
create or replace function public.billing_apply_subscription(
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
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.billing_events (event_id, type) values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;
  if not found then
    return false;
  end if;

  insert into public.subscriptions (
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

  if p_status in ('active', 'trialing') then
    update public.profiles set plan = p_plan, credits_period_start = now() where id = p_user;
    perform public.grant_credits(
      p_user, p_credits, 'subscription:' || p_plan, 'billing:' || p_event_id
    );
  elsif p_status in ('canceled', 'unpaid', 'incomplete_expired') then
    -- The plan drops, the credits stay. They were paid for.
    update public.profiles set plan = 'free' where id = p_user;
  end if;

  return true;
end; $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.grant_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.refresh_credit_cache(uuid) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, integer, text, text) to service_role;
grant execute on function public.refresh_credit_cache(uuid) to service_role;
grant execute on function public.credit_balance() to authenticated;
grant execute on function public.can_run_model(text) to authenticated;
grant execute on function public.plan_rank(text) to authenticated, service_role;
