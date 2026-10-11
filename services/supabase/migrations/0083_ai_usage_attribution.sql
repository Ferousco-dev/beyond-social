-- Attribution for AI spend: which organisation it belongs to, and which piece
-- of work caused it.
--
-- `ai_usage` could only answer "what did this one call cost". Two questions it
-- could not answer are the ones actually asked of it. A budget is set on an
-- organisation rather than on each member in turn, so spend that cannot be
-- grouped by org cannot be governed by one. And a single chat message fans out
-- into four or five model calls, so per-call rows cannot say what the message
-- cost, or which request scheduled a publish that later failed.
--
-- Both columns are nullable and additive. Every existing row keeps its meaning,
-- and a caller that supplies neither behaves exactly as it does today.

alter table ai_usage add column if not exists org_id uuid references organizations(id) on delete set null;
alter table ai_usage add column if not exists trace_id text;

-- Org spend over a window is the query a budget asks, so it gets the index.
create index if not exists ai_usage_org_time_idx on ai_usage (org_id, created_at desc)
  where org_id is not null;

-- Traces are looked up whole, by id, when explaining one unit of work.
create index if not exists ai_usage_trace_idx on ai_usage (trace_id)
  where trace_id is not null;

create or replace function ai_usage_record(p_usage jsonb)
returns void language sql security definer set search_path = public as $$
  insert into ai_usage (
    request_id, user_id, org_id, trace_id, task, model, provider,
    input_tokens, output_tokens, cost_usd, latency_ms, fallbacks, attempts,
    cached, ok, error
  )
  values (
    p_usage->>'requestId',
    nullif(p_usage->>'userId', '')::uuid,
    nullif(p_usage->>'orgId', '')::uuid,
    nullif(p_usage->>'traceId', ''),
    p_usage->>'task',
    p_usage->>'model',
    p_usage->>'provider',
    coalesce((p_usage->>'inputTokens')::int, 0),
    coalesce((p_usage->>'outputTokens')::int, 0),
    coalesce((p_usage->>'costUsd')::numeric, 0),
    coalesce((p_usage->>'latencyMs')::int, 0),
    coalesce((p_usage->>'fallbacks')::int, 0),
    coalesce((p_usage->>'attempts')::int, 1),
    coalesce((p_usage->>'cached')::boolean, false),
    coalesce((p_usage->>'ok')::boolean, true),
    p_usage->>'error'
  );
$$;

-- Members may read their organisation's usage, which is what makes an org-level
-- spend view possible without handing out the service role. The existing
-- owner-scoped policy is left untouched, so personal usage is unaffected.
drop policy if exists "ai_usage_select_org" on ai_usage;
create policy "ai_usage_select_org" on ai_usage
  for select using (org_id is not null and is_org_member(org_id));

revoke all on function ai_usage_record(jsonb) from public, anon, authenticated;
grant execute on function ai_usage_record(jsonb) to service_role;
