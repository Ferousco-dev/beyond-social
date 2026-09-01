-- What polling needs to record, and what generating needs to read.
--
-- HeyGen requires a `voice_id` on every avatar video, and assigns the twin one
-- when it finishes training. Without somewhere to keep it, every generation
-- would have to fetch the group first just to learn a value that never changes,
-- turning one call into two on the path a person is waiting on.
--
-- `trained_at` is separate from `updated_at`, which moves for any edit. The
-- question worth answering later is when this likeness became usable, not when
-- the row was last touched.

alter table public.heygen_avatars
  add column if not exists provider_voice_id text,
  add column if not exists trained_at timestamptz,
  -- How many times polling has looked. A twin that has been 'pending' for
  -- fifty polls is stuck, and without a count that is indistinguishable from
  -- one that started a minute ago.
  add column if not exists poll_count integer not null default 0;

comment on column public.heygen_avatars.provider_voice_id is
  'HeyGen default_voice_id for the trained twin. Required on every video it generates.';

/*
 * Twins still waiting on HeyGen, oldest first.
 *
 * Service-role only: polling is a background job acting for everybody, not a
 * question a signed-in user asks about themselves.
 */
create or replace function public.pending_heygen_avatars(p_limit integer default 20)
returns table (
  user_id uuid,
  provider_avatar_id text,
  poll_count integer
) language sql stable security definer set search_path = public as $$
  select h.user_id, h.provider_avatar_id, h.poll_count
  from public.heygen_avatars h
  where h.training_status = 'pending'
    and h.provider_avatar_id is not null
  order by h.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.pending_heygen_avatars(integer) from public, anon, authenticated;
grant execute on function public.pending_heygen_avatars(integer) to service_role;
