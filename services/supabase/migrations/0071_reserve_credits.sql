-- Take the credits when the run starts, not when it finishes.
--
-- The balance was checked at the start and debited at the end, with nothing
-- holding the difference. Two runs started close together both passed the check
-- against the same balance, then both charged, and the account went negative.
-- It was survivable at six credits a video and is five times easier to hit now
-- that a paying account runs Kling at thirty.
--
-- This closes it by making the check and the debit one statement. The row lock
-- is on the account's own ledger, so a second reservation for the same user
-- waits for the first to commit and then sees the balance it left behind.
--
-- Deliberately reuses the external ref `generation:<id>` that
-- `complete_generation` writes. That function's insert is already idempotent on
-- that key, so a run reserved here and completed there is charged once and
-- neither function needs to know about the other. A run that fails is refunded
-- by `fail_generation`, which reads the debit rather than assuming one, so it
-- keeps working unchanged.

create or replace function public.reserve_generation_credits(p_generation uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gen public.video_generations;
  v_cost integer;
  v_balance integer;
begin
  select * into v_gen from public.video_generations where id = p_generation;
  if not found then
    return false;
  end if;

  -- An unlisted model still ran and still costs us money, so it falls back to
  -- the base rate rather than to free, exactly as completion does.
  select coalesce(max(credit_cost), 1) into v_cost
    from public.model_catalog where id = v_gen.model;

  if v_cost <= 0 then
    return true;
  end if;

  /*
   * The lock is the whole point.
   *
   * Summing without it lets two transactions read the same balance before
   * either writes. Locking this account's ledger rows serialises reservations
   * per user, and only per user: two people generating at once do not wait on
   * each other.
   */
  perform 1 from public.credit_ledger where user_id = v_gen.user_id for update;

  select coalesce(sum(delta), 0) into v_balance
    from public.credit_ledger where user_id = v_gen.user_id;

  if v_balance < v_cost then
    return false;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
  values (v_gen.user_id, -v_cost, 'video_generation', v_gen.id, 'debit',
          'generation:' || v_gen.id)
  on conflict (external_ref) where external_ref is not null do nothing;

  return true;
end;
$$;

revoke all on function public.reserve_generation_credits(uuid) from public;
grant execute on function public.reserve_generation_credits(uuid) to service_role;

comment on function public.reserve_generation_credits(uuid) is
  'Atomically checks the balance and takes the credits for a run. False when there are not enough.';
