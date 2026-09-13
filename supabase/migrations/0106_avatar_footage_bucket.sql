-- A private bucket for HeyGen avatar training footage.
--
-- Kept separate from `uploads` (images and voice clips, capped at 10MB) and
-- `video-uploads` (user-supplied motion-control clips): avatar training footage
-- has its own consent record, its own retention path, and a size ceiling that
-- reflects what a 2-minute 1080p recording actually produces.
--
-- The `uploads` bucket was restricted to image MIME types by 0027_upload_limits
-- and could never have accepted video. Footage uploaded there was silently
-- rejected with "mime type video/mp4 is not supported" regardless of browser.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatar-footage',
  'avatar-footage',
  false,
  -- 256 MB: a 2-minute 1080p H.264 recording at typical quality runs 100-200 MB.
  -- Anything larger is not usable training footage; the cap keeps the bucket from
  -- becoming general video hosting.
  256 * 1024 * 1024,
  -- MP4 from Safari and newer Chrome, MOV from iOS camera roll uploads,
  -- WebM from Chrome and Firefox MediaRecorder.
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Owners may read, write, and delete their own footage. All paths are prefixed
-- with the owner's user id, enforced by the server actions and edge functions
-- that mint signed upload URLs; the phone handoff uses the service role, which
-- bypasses RLS and needs no explicit policy here.

drop policy if exists "Users read own avatar footage" on storage.objects;
create policy "Users read own avatar footage"
  on storage.objects for select
  using (
    bucket_id = 'avatar-footage'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users write own avatar footage" on storage.objects;
create policy "Users write own avatar footage"
  on storage.objects for insert
  with check (
    bucket_id = 'avatar-footage'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own avatar footage" on storage.objects;
create policy "Users delete own avatar footage"
  on storage.objects for delete
  using (
    bucket_id = 'avatar-footage'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
