-- claim_twin_training claims every twin a person owns, not the one being
-- trained.
--
-- Written in 0091, before 0096 dropped heygen_avatars' unique constraint on
-- user_id so a person could hold more than one trained twin. The function's
-- own `where user_id = p_user` was never given a row to aim at, so a claim
-- for a brand new recording matches every other avatar that person owns
-- which happens to be unclaimed, 'ready', or 'failed' too, and stamps them
-- all with this request's training_request_id and training_claimed_at.
--
-- train-heygen-avatar itself was already fixed for the multi-avatar world:
-- it inserts a fresh row per recording and writes the provider's result back
-- scoped to that row's own id. The claim in front of it is the one place
-- still reasoning as if user_id picked out a single twin.
--
-- Scoped to the row now. p_user is kept as a defence-in-depth ownership
-- check, the same reasoning delete-heygen-avatar already applies to its own
-- lookup, not because id alone would be ambiguous.

drop function if exists public.claim_twin_training(uuid, uuid, interval);

create or replace function public.claim_twin_training(
  p_avatar uuid,
  p_user uuid,
  p_request uuid,
  p_stale_after interval default interval '15 minutes'
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_claimed uuid;
begin
  update public.heygen_avatars
    set training_request_id = p_request,
        training_claimed_at = now(),
        updated_at = now()
    where id = p_avatar
      and user_id = p_user
      and (
        training_request_id is null
        or training_claimed_at is null
        or training_claimed_at < now() - p_stale_after
        -- A finished attempt is not a claim. Re-recording is a legitimate new
        -- job, and refusing it would be a worse failure than a duplicate.
        or training_status in ('ready', 'failed')
      )
    returning training_request_id into v_claimed;

  -- coalesce, because an update that matched nothing leaves v_claimed null and
  -- "null = p_request" is null rather than false. A boolean function that can
  -- answer null is a trap for the next caller who writes "if not claimed".
  return coalesce(v_claimed = p_request, false);
end; $$;

revoke all on function public.claim_twin_training(uuid, uuid, uuid, interval) from public, anon, authenticated;
grant execute on function public.claim_twin_training(uuid, uuid, uuid, interval) to service_role;

comment on function public.claim_twin_training(uuid, uuid, uuid, interval) is
  'Claims the right to dispatch training for one twin row. Returns false when another dispatch already holds the claim.';
