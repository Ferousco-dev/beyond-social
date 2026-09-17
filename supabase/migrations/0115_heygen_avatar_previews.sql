-- Provider previews let people verify a trained likeness before they use it.
-- They are provider-hosted URLs, not copies of the person's source footage.
alter table public.heygen_avatars
  add column if not exists provider_preview_image_url text,
  add column if not exists provider_preview_video_url text;

comment on column public.heygen_avatars.provider_preview_image_url is
  'HeyGen-hosted still preview for the trained avatar.';
comment on column public.heygen_avatars.provider_preview_video_url is
  'HeyGen-hosted playable preview for the trained avatar.';
