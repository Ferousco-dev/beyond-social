-- A bucket for video the user supplies.
--
-- Separate from `uploads` rather than raising that bucket's ceiling. `uploads`
-- holds photos and voice clips and is capped at 10MB, which is the limit the
-- providers put on both. Raising it to hold video would also let someone put a
-- hundred megabyte file where a photo is expected, and the cap is the only
-- thing stopping that.
--
-- Feeds two different things that both take a video in: motion control, which
-- transfers a performance onto a character image, and video-to-video, which
-- edits the clip itself.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-uploads',
  'video-uploads',
  false,
  -- The provider's own ceiling. Allowing more would accept an upload that is
  -- refused later, after the credit has been reserved.
  104857600,
  array['video/mp4', 'video/quicktime', 'video/x-matroska']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/*
 * Scoped by the first path segment, the same way `uploads` is: a path only
 * belongs to the user whose id opens it. Private, so reading needs a signed
 * url, which is what the provider is handed and what expires afterwards.
 */

drop policy if exists "Users read own video uploads" on storage.objects;
create policy "Users read own video uploads"
  on storage.objects for select
  using (
    bucket_id = 'video-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users write own video uploads" on storage.objects;
create policy "Users write own video uploads"
  on storage.objects for insert
  with check (
    bucket_id = 'video-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own video uploads" on storage.objects;
create policy "Users delete own video uploads"
  on storage.objects for delete
  using (
    bucket_id = 'video-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
