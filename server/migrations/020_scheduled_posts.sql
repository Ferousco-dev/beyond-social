-- Posts to social accounts. The video is copied into private storage first, so a
-- provider link that expires before the scheduled time does not matter.
create table public.scheduled_posts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  platform         text not null check (platform in ('youtube', 'tiktok', 'instagram')),
  title            text not null default '' check (char_length(title) <= 100),
  caption          text not null default '' check (char_length(caption) <= 2200),
  visibility       text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  -- Where the video came from, and where it is kept.
  source_url       text not null,
  job_id           uuid references public.jobs (id) on delete set null,
  storage_path     text,
  scheduled_at     timestamptz not null,
  status           text not null default 'preparing'
                   check (status in ('preparing', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  attempts         integer not null default 0,
  -- Both the schedule and the lease: a worker claims a post by pushing this into
  -- the future, so a crashed worker's posts become due again by themselves.
  next_run_at      timestamptz,
  -- Set once, just before the platform is called. If it is set and no result was
  -- recorded, the post may or may not exist there, so it is never posted again.
  publish_started_at timestamptz,
  external_id      text,
  external_url     text,
  error            text,
  idempotency_key  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index scheduled_posts_idempotency_idx on public.scheduled_posts (user_id, idempotency_key) where idempotency_key is not null;
create index scheduled_posts_user_idx on public.scheduled_posts (user_id, scheduled_at desc);
create index scheduled_posts_due_idx on public.scheduled_posts (next_run_at) where status in ('preparing', 'scheduled', 'publishing');
alter table public.scheduled_posts enable row level security;
