-- Durable AI workflow orchestration. Workflows persist the validated plan,
-- its approval, and per-step states so execution survives server restarts.
-- next_run_at is the engine lease, same as jobs: claiming pushes it into the
-- future, terminal rows have it null, crashed runs become due by themselves.
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  objective text not null check (char_length(objective) between 1 and 500),
  status text not null default 'draft'
    check (status in ('draft', 'awaiting_clarification', 'awaiting_approval', 'approved', 'running', 'completed', 'failed', 'cancelled')),
  plan jsonb not null default '{}'::jsonb,
  -- sha256 of the canonical plan at approval time. Execution refuses to run a
  -- plan whose hash differs, so an approved plan cannot silently change.
  plan_hash text,
  approved_at timestamptz,
  -- Rolling conversation context: recent turns plus a summary, capped by the
  -- engine before every planning call. Never the full history.
  context jsonb not null default '{}'::jsonb,
  error text,
  idempotency_key text,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  user_id uuid not null,
  step_id text not null check (char_length(step_id) between 1 and 32),
  tool text not null check (char_length(tool) between 1 and 64),
  args jsonb not null default '{}'::jsonb,
  needs text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (workflow_id, step_id)
);

create index workflows_user_created_idx on public.workflows (user_id, created_at desc);
create index workflows_status_idx on public.workflows (status);
create index workflows_due_idx on public.workflows (next_run_at) where next_run_at is not null;
create unique index workflows_user_idempotency_idx on public.workflows (user_id, idempotency_key) where idempotency_key is not null;
create index workflow_steps_workflow_idx on public.workflow_steps (workflow_id);

-- Same posture as the other tables: owner reads over PostgREST, the Go API
-- bypasses RLS and enforces ownership in its own queries.
alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    return;
  end if;

  for t in select unnest(array['workflows', 'workflow_steps']) loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
  end loop;

  alter table public.workflows
    add constraint workflows_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
  alter table public.workflow_steps
    add constraint workflow_steps_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
end
$$;
