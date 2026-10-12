-- Pictures, video and audio a user attaches to a chat. The bucket is private:
-- the browser uploads through a signed token the API issues, and the API hands
-- providers a short-lived link when a file is used.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('user-media', 'user-media', false, 104857600, array[
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg'])
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;

create table public.media (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('image', 'video', 'audio')),
  name        text not null check (char_length(name) between 1 and 200),
  mime_type   text not null,
  size_bytes  bigint not null check (size_bytes > 0),
  path        text not null unique,
  -- A row exists as soon as an upload slot is issued; it is usable only once
  -- the object has been seen in storage.
  ready_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index media_user_idx on public.media (user_id, created_at desc);
alter table public.media enable row level security;

-- What a message carries: a snapshot of each attachment (id, kind, name, type, size).
alter table public.messages add column attachments jsonb not null default '[]'::jsonb;
