create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'ready')),
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists jobs_user_created_at_idx
  on public.jobs (user_id, created_at desc);

create index if not exists jobs_status_idx
  on public.jobs (status);
