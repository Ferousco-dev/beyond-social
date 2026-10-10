-- Fix the credit gate for signed-in users whose profile row is missing a plan.
--
-- The app treats unknown plans as "free" across the TypeScript layer, but the
-- SQL guard used by `can_run_model` did the opposite: it rejected the account as
-- `not_authenticated` when `profiles.plan` was null and returned a zero balance to
-- the UI. That made users look like they had 0 credits even though the ledger was
-- funded and their plan was effectively free.

create or replace function public.can_run_model(p_model text)
returns table (allowed boolean, reason text, credit_cost integer, balance integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_model public.model_catalog;
  v_plan text;
  v_balance integer;
begin
  v_user := auth.uid();
  if v_user is null then
    return query select false, 'not_authenticated', 0, 0;
  end if;

  select * into v_model
  from public.model_catalog
  where id = p_model;

  select coalesce(p.plan, 'free') into v_plan
  from public.profiles p
  where p.id = v_user;

  select coalesce(sum(l.delta), 0)::integer into v_balance
  from public.credit_ledger l
  where l.user_id = v_user;

  if v_model.id is null then
    return query select false, 'unknown_model', 0, v_balance;
  elsif not v_model.is_active then
    return query select false, 'model_inactive', v_model.credit_cost, v_balance;
  elsif public.plan_rank(coalesce(v_plan, 'free')) < public.plan_rank(v_model.min_plan) then
    return query select false, 'plan_tier', v_model.credit_cost, v_balance;
  elsif v_balance < v_model.credit_cost then
    return query select false, 'insufficient_credits', v_model.credit_cost, v_balance;
  else
    return query select true, 'ok', v_model.credit_cost, v_balance;
  end if;
end; $$;

-- Keep the balance function in step with the gate: a null plan means a free plan,
-- not an empty wallet.
create or replace function public.credit_balance()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_ledger
  where user_id = auth.uid();
$$;
