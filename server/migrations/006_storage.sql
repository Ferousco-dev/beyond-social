-- The private bucket the browser uploads avatar recordings to, through signed
-- upload tokens the API issues. Nothing here is readable from the browser: the
-- API reads it with the service role to hand HeyGen a short-lived link.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatar-footage', 'avatar-footage', false, 209715200, array['video/mp4', 'video/webm'])
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;
