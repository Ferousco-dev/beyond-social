-- Refunding a render that succeeded.
--
-- `fail_generation_by_id` updated the row with `where status <> 'ready'`, so a
-- late failure callback or a stale reconciliation pass would correctly decline
-- to move a finished render back to `failed`. It then fell straight through to
-- the refund and issued it anyway. A generation that rendered, was delivered,
-- and was charged for could be credited back in full, which is money leaving on
-- work the user actually received.
--
-- The `external_ref` conflict clause bounded it to one refund per generation
-- rather than an unbounded loop, so this is not the double refund it looks
-- like. One unearned refund on a successful render is the bug, and it is
-- reachable on a schedule: `reconcile-generations` sweeps rows that look stuck,
-- and a row that finished between the sweep's query and its call is exactly
-- this case.
--
-- The fix is to make the refund conditional on the transition rather than
-- adjacent to it. The status check moves above both statements, the function
-- reports whether it actually transitioned, and everything a failure triggers
-- downstream, the customer webhook included, now hangs off that answer.
--
-- `cancelled` is excluded alongside `ready` for the same reason: cancelling
-- already settles its own refund, so failing a cancelled row would be a second
-- one on a different path.

-- The return type changes, which `create or replace` cannot do.
drop function if exists public.fail_generation_by_id(uuid, text);
drop function if exists public.fail_generation(text, text);

create function public.fail_generation_by_id(
  p_generation uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_gen public.video_generations;
  v_debit integer;
begin
  select * into v_gen from public.video_generations
    where id = p_generation for update;

  -- The row is locked before its status is read, so two callers racing on the
  -- same generation cannot both see a failable row and both refund it.
  if not found or v_gen.status not in ('queued', 'generating') then
    return false;
  end if;

  update public.video_generations
    set status = 'failed', error = p_error
    where id = v_gen.id;

  -- Reads the debit rather than assuming one, so a run that was never charged
  -- is not refunded into credit it never had.
  select sum(delta) into v_debit from public.credit_ledger
    where generation_id = v_gen.id and kind = 'debit';

  if coalesce(v_debit, 0) < 0 then
    insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
    values (v_gen.user_id, -v_debit, 'video_generation_refund', v_gen.id, 'refund',
            'refund:' || v_gen.id)
    on conflict (external_ref) where external_ref is not null do nothing;
  end if;

  return true;
end; $$;

create function public.fail_generation(
  p_provider_task_id text,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.video_generations
    where provider_task_id = p_provider_task_id;
  if v_id is null then
    return false;
  end if;

  return public.fail_generation_by_id(v_id, p_error);
end; $$;

revoke all on function public.fail_generation_by_id(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_generation(text, text) from public, anon, authenticated;
grant execute on function public.fail_generation_by_id(uuid, text) to service_role;
grant execute on function public.fail_generation(text, text) to service_role;

comment on function public.fail_generation_by_id(uuid, text) is
  'Settles a queued or generating run as failed and refunds whatever it was charged. Returns true only when it actually transitioned, so callers can tell a real failure from a no-op.';

comment on function public.fail_generation(text, text) is
  'Settles a run as failed by provider task id. Returns true only when it actually transitioned.';
