-- Training a digital twin exactly once.
--
-- `train-heygen-avatar` upserted the row and then called HeyGen with nothing in
-- between: no claim, no request id, nothing that a second call could lose a
-- race against. A retried request, a double-submit, or a client that gave up on
-- a slow response and tried again would each dispatch a fresh training job.
--
-- A duplicate render wastes a credit. A duplicate twin is a separately trained
-- copy of somebody's face and voice sitting at a third party, and only the last
-- id dispatched ever reached the row, so every earlier one became an orphan the
-- deletion path could not name, let alone remove.
--
-- Two things are added. `training_request_id` is claimed before dispatch, so a
-- second caller can be told the work is already in flight, and it doubles as
-- the provider idempotency key. `orphaned_provider_avatar_ids` records any
-- group id that gets displaced, so deletion can clean up something the row no
-- longer points at rather than leaving it at the provider forever.

alter table public.heygen_avatars
  add column if not exists training_request_id uuid,
  add column if not exists training_claimed_at timestamptz,
  add column if not exists orphaned_provider_avatar_ids text[] not null default '{}';

/*
 * Claims the right to dispatch one training job.
 *
 * `update ... where` is the whole mechanism: the row is matched and written in
 * one statement, so of two callers arriving together exactly one matches an
 * unclaimed row and the other matches nothing. A read followed by a write is
 * the version of this that does not work.
 *
 * A claim older than the timeout is reclaimable, because a dispatch that died
 * between claiming and answering would otherwise wedge that person's twin
 * forever. The window is long enough that it cannot overlap a live request.
 */
create or replace function public.claim_twin_training(
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
    where user_id = p_user
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

/*
 * Moves a displaced group id into the orphan list.
 *
 * Called when a dispatch comes back with a group that is not the one the row
 * already holds, which is what a duplicate looks like after the fact. Keeping
 * the id is the difference between an orphan somebody can delete and a trained
 * copy of a face that nothing in this system knows exists.
 */
create or replace function public.orphan_twin_avatar(
  p_user uuid,
  p_avatar_id text
)
returns void
language sql
security definer
set search_path to ''
as $$
  update public.heygen_avatars
    set orphaned_provider_avatar_ids =
          array(select distinct unnest(orphaned_provider_avatar_ids || array[p_avatar_id])),
        updated_at = now()
    where user_id = p_user
      and p_avatar_id is not null
      and p_avatar_id <> '';
$$;

revoke all on function public.claim_twin_training(uuid, uuid, interval) from public, anon, authenticated;
revoke all on function public.orphan_twin_avatar(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_twin_training(uuid, uuid, interval) to service_role;
grant execute on function public.orphan_twin_avatar(uuid, text) to service_role;

comment on function public.claim_twin_training(uuid, uuid, interval) is
  'Claims the right to dispatch one twin training job. Returns false when another dispatch already holds the claim.';

comment on column public.heygen_avatars.orphaned_provider_avatar_ids is
  'Provider avatar groups this row displaced. Kept so deletion can remove copies of a likeness the row no longer points at.';
