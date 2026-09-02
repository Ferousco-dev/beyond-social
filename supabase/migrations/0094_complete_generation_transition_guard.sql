-- Announcing a completion once.
--
-- `complete_generation` already refuses to move a row that is `ready` or
-- `cancelled`, so the database side of a redelivered callback was idempotent.
-- The outbound customer webhook was not: `kie-callback` fired
-- `generation.completed` whether or not the row had actually transitioned, so a
-- provider retry, and kie.ai retries three times, sent a customer the same
-- completion again.
--
-- Same shape as the failure path in 0090, and for the same reason: the
-- transition is the event, so everything the event triggers has to hang off
-- whether the transition happened rather than off having been asked.
--
-- This is deliberately not the transactional outbox the audit sketched. The
-- database transition is already the single point where a generation settles
-- exactly once, so gating on it removes the duplicate at the source rather than
-- deduplicating downstream. What an outbox would add on top is durable retry of
-- a delivery that failed, which is a different problem, is written down in the
-- backlog, and is not what this finding is about.

-- The return type changes, which `create or replace` cannot do.
drop function if exists public.complete_generation(text, text);

create function public.complete_generation(
  p_provider_task_id text,
  p_result_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gen public.video_generations;
  v_cost integer;
  v_path text;
begin
  select * into v_gen from public.video_generations
    where provider_task_id = p_provider_task_id for update;

  if not found or v_gen.status in ('ready', 'cancelled') then
    return false;
  end if;

  v_path := nullif(split_part(p_result_url, '/object/public/renders/', 2), '');
  if v_path is null then
    v_path := nullif(split_part(p_result_url, '/object/sign/renders/', 2), '');
  end if;

  update public.video_generations
    set status = 'ready', result_url = p_result_url, result_path = v_path, error = null
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

  return true;
end;
$$;

revoke all on function public.complete_generation(text, text) from public, anon, authenticated;
grant execute on function public.complete_generation(text, text) to service_role;

comment on function public.complete_generation(text, text) is
  'Settles a run as ready and charges it. Returns true only when it actually transitioned, so a redelivered callback does not announce a completion twice.';
