-- A video of a trained twin is a generation like any other.
--
-- The twin path had nowhere to write. `generate-heygen-avatar` returned the
-- provider's video id to the caller and recorded nothing, so there was no row
-- to poll, no status to show, no error to read and no way for the finished
-- video to reach the library. Everything that makes a kie render visible hangs
-- off a `video_generations` row, so the twin path gets one too rather than a
-- second table that would need a second poller, a second refund rule and a
-- second copy of the library query.
--
-- Two things have to change for that row to work.

/*
 * 1. The row records which twin spoke.
 *
 * `prompt` holds the script and `model` holds the engine, but neither says
 * which of somebody's several likenesses is on screen, and since 0096 a person
 * may hold several. Nulled rather than cascaded on delete: erasing a likeness
 * must not erase the record that a video was made and charged for.
 */
alter table public.video_generations
  add column if not exists heygen_avatar_id uuid
    references public.heygen_avatars (id) on delete set null;

comment on column public.video_generations.heygen_avatar_id is
  'The trained twin this render used. Null for every render that was not made from one.';

-- Drives the twin video poller, which asks HeyGen about exactly these rows.
create index if not exists video_generations_heygen_pending_idx
  on public.video_generations (created_at)
  where provider = 'heygen' and status = 'generating';

/*
 * 2. The credits for a run can be priced by the caller.
 *
 * `reserve_generation_credits` reads the price out of `model_catalog`, which
 * works because every model it has ever reserved for is a kie model with a row
 * there. HeyGen is billed on a subscription plus a rate per minute of output,
 * which nobody has yet turned into a flat per-run number, so there is no
 * catalogue row to read and inventing one would be charging a guessed price.
 *
 * The price for that path lives in `HEYGEN_CREDIT_COST`, which the edge
 * function refuses to run without. This is how it reaches the one statement
 * that checks the balance and debits it, so the twin path holds credits under
 * exactly the same lock, the same external ref and the same refund rule as
 * every other render rather than under a second implementation of them.
 */
create or replace function public.reserve_generation_credits_at(
  p_generation uuid,
  p_cost integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gen public.video_generations;
  v_balance integer;
begin
  select * into v_gen from public.video_generations where id = p_generation;
  if not found then
    return false;
  end if;

  if p_cost is null or p_cost < 0 then
    return false;
  end if;

  if p_cost = 0 then
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

  if v_balance < p_cost then
    return false;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
  values (v_gen.user_id, -p_cost, 'video_generation', v_gen.id, 'debit',
          'generation:' || v_gen.id)
  on conflict (external_ref) where external_ref is not null do nothing;

  return true;
end;
$$;

-- The catalogue lookup is all that is left of the original: the body it used to
-- hold is above, so both paths reserve by one rule rather than by two copies of
-- it that can drift.
create or replace function public.reserve_generation_credits(p_generation uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model text;
  v_cost integer;
begin
  select model into v_model from public.video_generations where id = p_generation;
  if v_model is null then
    return false;
  end if;

  -- An unlisted model still ran and still costs us money, so it falls back to
  -- the base rate rather than to free, exactly as completion does.
  select coalesce(max(credit_cost), 1) into v_cost
    from public.model_catalog where id = v_model;

  return public.reserve_generation_credits_at(p_generation, v_cost);
end;
$$;

revoke all on function public.reserve_generation_credits_at(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_generation_credits_at(uuid, integer) to service_role;

comment on function public.reserve_generation_credits_at(uuid, integer) is
  'Atomically checks the balance and takes a stated number of credits for a run. False when there are not enough. For providers whose price does not come from model_catalog.';
