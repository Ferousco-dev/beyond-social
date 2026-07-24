-- Generation lifecycle functions. These run with elevated rights so the edge
-- functions (service role) can complete or fail a kie.ai task and account for
-- credits atomically. They are NOT exposed to clients.

-- Mark a generation ready, store the result, and charge exactly one credit.
-- Idempotent: a duplicate webhook will not double-charge.
create or replace function public.complete_generation(
  p_provider_task_id text,
  p_result_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gen public.video_generations;
begin
  select * into v_gen
    from public.video_generations
    where provider_task_id = p_provider_task_id
    for update;

  if not found or v_gen.status = 'ready' then
    return;
  end if;

  update public.video_generations
    set status = 'ready', result_url = p_result_url, error = null
    where id = v_gen.id;

  update public.profiles
    set credits_used = credits_used + 1
    where id = v_gen.user_id;

  insert into public.credit_ledger (user_id, delta, reason, generation_id)
    values (v_gen.user_id, -1, 'video_generation', v_gen.id);
end;
$$;

-- Mark a generation failed (no credit is charged for failures).
create or replace function public.fail_generation(
  p_provider_task_id text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.video_generations
    set status = 'failed', error = p_error
    where provider_task_id = p_provider_task_id and status <> 'ready';
end;
$$;

-- Roll each profile's monthly quota over. Safe to run on a daily schedule.
create or replace function public.reset_due_credits()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
    set credits_used = 0,
        credits_period_start = date_trunc('month', now())
    where credits_period_start < date_trunc('month', now());
end;
$$;

-- Restrict these to the service role only; clients must never call them.
revoke execute on function public.complete_generation(text, text) from public, anon, authenticated;
revoke execute on function public.fail_generation(text, text) from public, anon, authenticated;
revoke execute on function public.reset_due_credits() from public, anon, authenticated;
grant execute on function public.complete_generation(text, text) to service_role;
grant execute on function public.fail_generation(text, text) to service_role;
grant execute on function public.reset_due_credits() to service_role;
