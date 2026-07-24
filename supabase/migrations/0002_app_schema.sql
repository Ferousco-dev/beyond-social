-- Core application schema: projects, conversations, video generation (kie.ai),
-- assets, publishing, and a credit ledger. Owner-scoped via RLS throughout.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.generation_status as enum ('queued', 'generating', 'ready', 'failed');
create type public.social_platform as enum ('tiktok', 'instagram', 'facebook', 'youtube');
create type public.post_status as enum ('scheduled', 'publishing', 'published', 'failed');
create type public.message_role as enum ('user', 'assistant');
create type public.asset_kind as enum ('photo', 'video', 'audio');

-- ---------------------------------------------------------------------------
-- Credits on the profile (a fixed monthly quota per plan)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column plan text not null default 'free',
  add column credits_total integer not null default 15 check (credits_total >= 0),
  add column credits_used integer not null default 0 check (credits_used >= 0),
  add column credits_period_start timestamptz not null default date_trunc('month', now());

-- ---------------------------------------------------------------------------
-- Projects (one per conversation / video effort)
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New project',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_id_updated_at_idx on public.projects (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Conversation messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.message_role not null,
  content text not null default '',
  created_at timestamptz not null default now()
);
create index messages_project_id_created_at_idx on public.messages (project_id, created_at);

-- ---------------------------------------------------------------------------
-- Uploaded assets (photos feed the generation)
-- ---------------------------------------------------------------------------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  kind public.asset_kind not null default 'photo',
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index assets_user_id_idx on public.assets (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Video generations (kie.ai Veo tasks)
-- ---------------------------------------------------------------------------
create table public.video_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'kie',
  model text not null default 'veo3_fast',
  prompt text not null,
  aspect_ratio text not null default '9:16',
  resolution text not null default '720p',
  duration integer not null default 8,
  image_urls text[] not null default '{}',
  status public.generation_status not null default 'queued',
  provider_task_id text,
  result_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index video_generations_user_status_idx on public.video_generations (user_id, status);
create index video_generations_project_idx on public.video_generations (project_id, created_at desc);
-- Fast lookup from the kie.ai webhook (which only knows the task id).
create unique index video_generations_provider_task_id_idx
  on public.video_generations (provider_task_id)
  where provider_task_id is not null;

-- ---------------------------------------------------------------------------
-- Scheduled posts (publishing)
-- ---------------------------------------------------------------------------
create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  generation_id uuid references public.video_generations (id) on delete set null,
  platform public.social_platform not null,
  caption text not null default '',
  hashtags text not null default '',
  scheduled_for timestamptz not null,
  status public.post_status not null default 'scheduled',
  external_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scheduled_posts_user_status_idx on public.scheduled_posts (user_id, status);
-- Drives the "due posts" worker query.
create index scheduled_posts_due_idx
  on public.scheduled_posts (scheduled_for)
  where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- Credit ledger (audit trail of every credit movement)
-- ---------------------------------------------------------------------------
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  generation_id uuid references public.video_generations (id) on delete set null,
  created_at timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
create trigger video_generations_set_updated_at
  before update on public.video_generations
  for each row execute function public.set_updated_at();
create trigger scheduled_posts_set_updated_at
  before update on public.scheduled_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: every table is private to its owner.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.assets enable row level security;
alter table public.video_generations enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.credit_ledger enable row level security;

create policy "Owners manage their projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owners manage their messages" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owners manage their assets" on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owners read their generations" on public.video_generations
  for select using (auth.uid() = user_id);
create policy "Owners create their generations" on public.video_generations
  for insert with check (auth.uid() = user_id);
create policy "Owners manage their scheduled posts" on public.scheduled_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owners read their credit ledger" on public.credit_ledger
  for select using (auth.uid() = user_id);
-- Generation status transitions and ledger writes happen only through the
-- SECURITY DEFINER functions below (called by the edge functions), never by
-- clients directly, so no owner UPDATE/INSERT policy is granted for those.
