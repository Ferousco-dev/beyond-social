-- Prompt-learning subsystem storage: the review queue (candidates), the
-- immutable audit trail, full version history of accepted chunks, and an
-- experiments table for A/B testing prompt strategies. All access is through
-- SECURITY DEFINER functions granted to service_role only; the learning workflow
-- runs server-side. A nullable workspace_id on every row keeps the design
-- multi-tenant ready without forcing tenancy now.

-- Candidates awaiting the gate/review before they may enter the knowledge base.
create table if not exists prompt_candidates (
  id           text primary key,
  workspace_id text,
  status       text not null default 'pending',
  data         jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists prompt_candidates_status_idx on prompt_candidates (status);
create index if not exists prompt_candidates_ws_idx on prompt_candidates (workspace_id);

-- Immutable audit trail: every change to the base leaves exactly one row.
create table if not exists prompt_audit_log (
  id           text primary key,
  action       text not null,
  chunk_id     text,
  candidate_id text,
  workspace_id text,
  data         jsonb not null,
  created_at   timestamptz not null default now()
);
create index if not exists prompt_audit_chunk_idx on prompt_audit_log (chunk_id);
create index if not exists prompt_audit_created_idx on prompt_audit_log (created_at desc);

-- Full version history of accepted chunks (append-only, never overwritten).
create table if not exists prompt_chunk_versions (
  chunk_id   text not null,
  version    int not null,
  data       jsonb not null,
  reason     text not null,
  created_at timestamptz not null default now(),
  primary key (chunk_id, version)
);

-- Prompt-strategy experiments (A/B of recipes / ranking weights). Analytics and
-- rollout logic live in the app; this is the durable definition + results store.
create table if not exists prompt_experiments (
  id         text primary key,
  name       text not null,
  status     text not null default 'draft',
  variants   jsonb not null default '[]',
  metrics    jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table prompt_candidates enable row level security;
alter table prompt_audit_log enable row level security;
alter table prompt_chunk_versions enable row level security;
alter table prompt_experiments enable row level security;

create or replace function prompt_record_candidate(p_candidate jsonb)
returns void language sql security definer set search_path = public as $$
  insert into prompt_candidates (id, workspace_id, status, data)
  values (
    p_candidate->>'id', p_candidate->>'workspaceId',
    coalesce(p_candidate->>'status', 'pending'), p_candidate
  )
  on conflict (id) do update set data = excluded.data, status = excluded.status, updated_at = now();
$$;

create or replace function prompt_get_candidate(p_id text)
returns table (data jsonb) language sql stable security definer set search_path = public as $$
  select data from prompt_candidates where id = p_id;
$$;

create or replace function prompt_list_candidates(p_status text, p_workspace text)
returns table (data jsonb) language sql stable security definer set search_path = public as $$
  select data from prompt_candidates
  where status = p_status and (p_workspace is null or workspace_id = p_workspace)
  order by created_at desc;
$$;

create or replace function prompt_set_candidate_status(p_id text, p_status text)
returns void language sql security definer set search_path = public as $$
  update prompt_candidates
  set status = p_status,
      data = jsonb_set(data, '{status}', to_jsonb(p_status)),
      updated_at = now()
  where id = p_id;
$$;

create or replace function prompt_log_audit(p_entry jsonb)
returns void language sql security definer set search_path = public as $$
  insert into prompt_audit_log (id, action, chunk_id, candidate_id, workspace_id, data)
  values (
    p_entry->>'id', p_entry->>'action', p_entry->>'chunkId',
    p_entry->>'candidateId', p_entry->>'workspaceId', p_entry
  )
  on conflict (id) do nothing;
$$;

create or replace function prompt_save_version(p_chunk jsonb, p_reason text)
returns void language sql security definer set search_path = public as $$
  insert into prompt_chunk_versions (chunk_id, version, data, reason)
  values (p_chunk->>'id', (p_chunk->>'version')::int, p_chunk, p_reason)
  on conflict (chunk_id, version) do update set data = excluded.data, reason = excluded.reason;
$$;

revoke all on function prompt_record_candidate(jsonb) from public, anon, authenticated;
revoke all on function prompt_get_candidate(text) from public, anon, authenticated;
revoke all on function prompt_list_candidates(text, text) from public, anon, authenticated;
revoke all on function prompt_set_candidate_status(text, text) from public, anon, authenticated;
revoke all on function prompt_log_audit(jsonb) from public, anon, authenticated;
revoke all on function prompt_save_version(jsonb, text) from public, anon, authenticated;

grant execute on function prompt_record_candidate(jsonb) to service_role;
grant execute on function prompt_get_candidate(text) to service_role;
grant execute on function prompt_list_candidates(text, text) to service_role;
grant execute on function prompt_set_candidate_status(text, text) to service_role;
grant execute on function prompt_log_audit(jsonb) to service_role;
grant execute on function prompt_save_version(jsonb, text) to service_role;
