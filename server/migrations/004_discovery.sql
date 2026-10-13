-- Video discovery history and results.
create table public.discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform text not null check (platform in ('tiktok', 'instagram')),
  kind text not null check (kind in ('search', 'url')),
  query text not null check (char_length(query) between 1 and 500),
  requested_limit integer not null check (requested_limit between 1 and 60),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  apify_run_id text,
  result_count integer not null default 0 check (result_count >= 0),
  error text,
  retry_count integer not null default 0 check (retry_count >= 0),
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index discoveries_user_created_idx on public.discoveries (user_id, created_at desc);
create index discoveries_due_idx on public.discoveries (next_run_at) where next_run_at is not null;

create table public.discovery_videos (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid not null references public.discoveries (id) on delete cascade,
  user_id uuid not null,
  platform text not null check (platform in ('tiktok', 'instagram')),
  source_video_id text not null,
  position integer not null,
  page_url text not null,
  caption text,
  creator_handle text,
  creator_name text,
  thumbnail_url text,
  video_url text,
  duration_seconds double precision,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  share_count bigint,
  hashtags text[] not null default '{}',
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  unique (discovery_id, source_video_id)
);

create index discovery_videos_discovery_idx on public.discovery_videos (discovery_id, position);
create index discovery_videos_user_idx on public.discovery_videos (user_id);
