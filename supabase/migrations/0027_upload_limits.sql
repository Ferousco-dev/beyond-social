-- Bounds what can be put in the uploads bucket.
--
-- The policies on this bucket answer "whose file is it", which was the security
-- question. They do not answer "what is it and how big", which is the abuse
-- question: an authenticated account could store files of any size and any type,
-- billed to us, and those objects then become URLs we hand to a third-party
-- renderer.
--
-- Enforced by storage itself rather than by the client that happens to be
-- uploading, because a client-side check is a suggestion.

update storage.buckets
set
  -- Ten megabytes is generous for a source photo and far below the point where
  -- storage becomes a way to attack the bill.
  file_size_limit = 10 * 1024 * 1024,
  -- Photos feed image-to-video. Nothing else has a reason to be here, and
  -- narrowing the list is what stops the bucket becoming general file hosting.
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'uploads';

-- Renders are written by the service role from the callback, never by a user, so
-- the limit here is a backstop rather than a control. It matches the ceiling the
-- edge function enforces before it buffers a response.
update storage.buckets
set
  file_size_limit = 200 * 1024 * 1024,
  allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm']
where id = 'renders';
