-- Cancelling a render.
--
-- The provider has no cancel endpoint, so cancelling cannot stop the work. It
-- stops the waiting: the draft leaves the thread and the client stops polling,
-- while the render finishes at the provider regardless.
--
-- The charge therefore has to be written here. Credits are debited in
-- `complete_generation`, so a cancelled render that never completes would
-- otherwise cost the user nothing, which turns cancel into a free-video button:
-- dispatch, cancel, repeat. The debit reuses the `generation:<id>` external ref
-- that completion uses, so whichever path runs first charges once and the other
-- hits the existing on-conflict guard.

-- Called with the service role, and the owner is passed in, the same shape as
-- `complete_generation`. Writing the debit refreshes the caller's credit cache,
-- and the profile guard from 0042 rejects that when it happens under the
-- account holder's own identity, which is what a security definer function
-- called straight from the client would look like. The server action resolves
-- the session and passes the id it verified.
create or replace function public.cancel_generation(p_generation_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_gen public.video_generations;
  v_cost integer;
begin
  select * into v_gen from public.video_generations
    where id = p_generation_id for update;

  -- Ownership is still enforced, against the id the caller verified rather
  -- than against auth.uid(), which is null under the service role.
  if not found or v_gen.user_id <> p_user_id then
    return;
  end if;

  -- Only something still in flight can be cancelled. Re-cancelling a settled
  -- row must not move it, and must not charge for it twice.
  if v_gen.status not in ('queued', 'generating') then
    return;
  end if;

  update public.video_generations
    set status = 'cancelled', error = 'Cancelled while rendering'
    where id = v_gen.id;

  select coalesce(max(credit_cost), 1) into v_cost
    from public.model_catalog where id = v_gen.model;

  if v_cost > 0 then
    insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
    values (v_gen.user_id, -v_cost, 'video_generation', v_gen.id, 'debit',
            'generation:' || v_gen.id)
    on conflict (external_ref) where external_ref is not null do nothing;
  end if;
end; $$;

-- Service role only. Granting this to `authenticated` would let anyone charge
-- and settle a row by id, so the ownership check above is not the only gate.
revoke all on function public.cancel_generation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_generation(uuid, uuid) to service_role;

-- A late callback must not resurrect a cancelled render. Previously only
-- `ready` was treated as settled, so a result arriving after a cancel would
-- flip the row back and show a draft the person had dismissed.
create or replace function public.complete_generation(p_provider_task_id text, p_result_url text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_gen public.video_generations;
  v_cost integer;
begin
  select * into v_gen from public.video_generations
    where provider_task_id = p_provider_task_id for update;

  if not found or v_gen.status in ('ready', 'cancelled') then
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
