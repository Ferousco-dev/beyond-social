-- An editor project is one timeline document. The version is an optimistic lock:
-- a save names the version it was based on, so two tabs cannot silently
-- overwrite each other.
create table public.editor_projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null default 'Untitled project' check (char_length(title) between 1 and 120),
  document    jsonb not null default '{}'::jsonb check (jsonb_typeof(document) = 'object'),
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index editor_projects_user_idx on public.editor_projects (user_id, updated_at desc);
alter table public.editor_projects enable row level security;
