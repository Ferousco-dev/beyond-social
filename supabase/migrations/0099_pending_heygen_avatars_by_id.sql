-- pending_heygen_avatars stopped identifying a row the moment a person could
-- have more than one.
--
-- Migration 0096 dropped heygen_avatars' unique constraint on user_id so
-- somebody could keep several trained twins. This function predates that
-- (0088) and still returns only user_id, provider_avatar_id and poll_count,
-- with no way to name which of a person's rows it is actually reporting on.
-- poll-heygen-training/index.ts has no choice but to write its result back
-- with `.eq("user_id", ...)`, which now updates every avatar that person
-- owns rather than the one just polled: a second avatar finishing training
-- overwrites a first, already-ready avatar's voice id and consent status
-- with the second one's, and a second avatar failing marks the first one
-- failed too.
--
-- Returning the row's own id lets the caller update by id instead.

drop function if exists public.pending_heygen_avatars(integer);

create or replace function public.pending_heygen_avatars(p_limit integer default 20)
returns table (
  id uuid,
  user_id uuid,
  provider_avatar_id text,
  poll_count integer
) language sql stable security definer set search_path = public as $$
  select h.id, h.user_id, h.provider_avatar_id, h.poll_count
  from public.heygen_avatars h
  where h.training_status = 'pending'
    and h.provider_avatar_id is not null
  order by h.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.pending_heygen_avatars(integer) from public, anon, authenticated;
grant execute on function public.pending_heygen_avatars(integer) to service_role;
