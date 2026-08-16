-- Failing a run that never reached the provider.
--
-- `fail_generation` is keyed by the provider's task id, which is the only
-- handle the callback and the poller have. Reserving credits before dispatch
-- creates a window where a run has to be failed and refunded and no task id
-- exists yet: the provider refused the request, or the reservation itself came
-- back short. Keying that off a null task id would settle every undispatched
-- row at once.
--
-- The body moves here and `fail_generation` becomes the lookup that finds the
-- id, so both paths refund by the same rule rather than by two copies of it.

create or replace function public.fail_generation_by_id(
  p_generation uuid,
  p_error text
)
returns void
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
  if not found then
    return;
  end if;

  update public.video_generations
    set status = 'failed', error = p_error
    where id = v_gen.id and status <> 'ready';

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
end; $$;

create or replace function public.fail_generation(
  p_provider_task_id text,
  p_error text
)
returns void
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
    return;
  end if;

  perform public.fail_generation_by_id(v_id, p_error);
end; $$;

revoke all on function public.fail_generation_by_id(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_generation_by_id(uuid, text) to service_role;

comment on function public.fail_generation_by_id(uuid, text) is
  'Settles a run as failed and refunds whatever it was charged. For runs that have no provider task id yet.';
