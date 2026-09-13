-- HeyGen self-service accounts cannot upload prerecorded consent videos through
-- the API. They must send the avatar subject to HeyGen's hosted webcam consent
-- page, whose URL is minted from POST /v3/avatars/{group_id}/consent without a
-- consent_video payload. Keep that short-lived URL so a user who closes the tab
-- can resume setup without recording training footage again.

alter table public.heygen_avatars
  add column if not exists provider_consent_url text,
  add column if not exists provider_consent_url_expires_at timestamptz;

comment on column public.heygen_avatars.provider_consent_url is
  'Short-lived HeyGen-hosted webcam consent URL. Null once the avatar is ready. This is the self-service consent path; no prerecorded consent video is uploaded.';
comment on column public.heygen_avatars.provider_consent_url_expires_at is
  'Approximate expiry for provider_consent_url. HeyGen documents hosted consent links as valid for 24 hours.';

-- The poller needs both the group id (consent/status) and the look id (the value
-- ultimately passed as avatar_id to /v3/videos) so it does not mark an avatar
-- ready while the group is completed but the renderable look is still training.
drop function if exists public.pending_heygen_avatars(integer);

create or replace function public.pending_heygen_avatars(p_limit integer default 20)
returns table (id uuid, user_id uuid, provider_avatar_id text, provider_look_id text, poll_count integer)
language sql
security definer
set search_path = public
as $$
  select h.id, h.user_id, h.provider_avatar_id, h.provider_look_id, h.poll_count
  from public.heygen_avatars h
  where h.training_status = 'pending'
    and h.provider_avatar_id is not null
  order by h.updated_at asc
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.pending_heygen_avatars(integer) from public, anon, authenticated;
grant execute on function public.pending_heygen_avatars(integer) to service_role;
