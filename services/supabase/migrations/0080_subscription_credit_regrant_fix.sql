-- billing_apply_subscription granted a fresh month of credits on every
-- `active`/`trialing` webhook event, not just on an actual renewal.
--
-- The event-level idempotency in billing_events (unique on event_id) only
-- stops the *same* Stripe event from being applied twice on a retried
-- delivery. It does nothing to stop two genuinely different events, each
-- with their own event_id, from both granting credits: Stripe fires
-- customer.subscription.updated for a cancel_at_period_end toggle, a
-- payment-method change, a metadata edit, or a proration adjustment, none
-- of which is a renewal. A user flipping cancel-then-uncancel twice inside
-- one billing cycle walked away with three months of credits for one.
--
-- The real signal for "a period actually rolled over" is current_period_end
-- moving forward, not any event arriving. Stripe only advances it on
-- creation and on genuine renewal; everything else on the same
-- subscription keeps it exactly where it was.
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

  -- Read before the upsert below overwrites it, or there would be nothing
  -- left to compare the new value against.
  select current_period_end into v_previous_period_end
  from public.subscriptions where id = p_subscription_id;

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

    -- A row that did not exist before this event is a brand new
    -- subscription and always earns its first grant. One that did exists
    -- only earns another when the period actually moved; comparing with
    -- `is distinct from` treats a null-to-value change as a change too,
    -- which is what a first sighting of a period end looks like.
    if v_previous_period_end is null or v_previous_period_end is distinct from p_period_end then
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
