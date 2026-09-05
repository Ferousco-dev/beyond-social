-- Removing a mechanism that stopped applying when training became insert-only.
--
-- `orphan_twin_avatar` and `orphaned_provider_avatar_ids` (0091) exist for a
-- world where retraining reused one row per person: a retry could overwrite
-- that row's `provider_avatar_id` with a new group id, stranding the old one
-- at the provider with nothing pointing at it. 0096 changed training to
-- insert a new row per recording instead, and `train-heygen-avatar` writes
-- `provider_avatar_id` exactly once per row, scoped by that row's own id
-- (0100's "the group id is written the moment it is known" comment). There is
-- no update left that can displace an existing value, so nothing has ever
-- called `orphan_twin_avatar` and the column it fills has been permanently
-- empty since it was added. Dead code describing a failure mode the current
-- design cannot produce.

drop function if exists public.orphan_twin_avatar(uuid, text);

alter table public.heygen_avatars
  drop column if exists orphaned_provider_avatar_ids;
