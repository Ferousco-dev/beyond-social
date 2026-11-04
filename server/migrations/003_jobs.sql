-- Durable background jobs. next_run_at is both the schedule and the lease: a
-- worker claims a row by pushing it into the future, so a crashed worker's rows
-- become due again by themselves. Terminal rows have it null.
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_type text not null check (char_length(job_type) between 1 and 64),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'ready')),
  stage text,
  progress smallint not null default 0 check (progress between 0 and 100),
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  retry_count integer not null default 0 check (retry_count >= 0),
  provider_task_id text,
  idempotency_key text,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index jobs_user_created_idx on public.jobs (user_id, created_at desc);
create index jobs_status_idx on public.jobs (status);
create index jobs_due_idx on public.jobs (next_run_at) where next_run_at is not null;
create unique index jobs_user_idempotency_idx on public.jobs (user_id, idempotency_key) where idempotency_key is not null;
create unique index jobs_provider_task_idx on public.jobs (provider_task_id) where provider_task_id is not null;
