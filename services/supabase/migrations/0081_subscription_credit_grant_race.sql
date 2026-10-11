-- 0080 stopped every active/trialing webhook from granting credits, only a
-- genuine period rollover, but it read current_period_end with a plain
-- select and no lock. Stripe commonly fires customer.subscription.created
-- and customer.subscription.updated for the same new subscription within
-- moments of each other; two concurrent webhook requests for the same
-- subscription id can both run that select before either one's upsert
-- commits, both see the same v_previous_period_end, and both go on to grant
-- credits under their own event's distinct external_ref, since
-- billing_events/grant_credits idempotency only dedupes a single event
-- redelivered, not two different events. `for update` closes that: the
-- second concurrent call blocks on the row lock and re-reads the first
-- call's committed period_end once it proceeds.
--
-- Separately, comparing with `is distinct from` treats a period_end that
-- arrived null (subscription.items.data can be empty on the Stripe object a
-- webhook carries) as "changed" whenever a period_end was already on file,
-- since anything IS DISTINCT FROM null in Postgres. That let a non-renewal
-- event with a missing period_end grant a spurious extra month. Only a
-- period_end that is present and later than what was on file is treated as
-- a renewal now.
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
declare
  v_previous_period_end timestamptz;
begin
  insert into public.billing_events (event_id, type) values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;
  if not found then
    return false;
  end if;

  -- Locks the row, if it already exists, for the rest of this transaction.
  select current_period_end into v_previous_period_end
  from public.subscriptions where id = p_subscription_id for update;

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
    update public.profiles set plan = p_plan where id = p_user;

    -- A brand new subscription (no row yet) always earns its first grant.
    -- Otherwise only a period_end that actually moved forward is a real
    -- renewal; a missing or unchanged one is not evidence anything rolled
    -- over.
    if p_period_end is not null
       and (v_previous_period_end is null or p_period_end > v_previous_period_end) then
      update public.profiles set credits_period_start = now() where id = p_user;
      perform public.grant_credits(
        p_user, p_credits, 'subscription:' || p_plan, 'billing:' || p_event_id
      );
    end if;
  elsif p_status in ('canceled', 'unpaid', 'incomplete_expired') then
    -- The plan drops, the credits stay. They were paid for.
    update public.profiles set plan = 'free' where id = p_user;
  end if;

  return true;
end; $$;
