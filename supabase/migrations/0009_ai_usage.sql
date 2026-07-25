-- Per-call AI usage: the record behind cost tracking, the usage dashboard, and
-- eventually billing. One row per attempt, including failures and cache hits,
-- because error rate and avoided spend are exactly what we need to see.

create table if not exists ai_usage (
  id            bigserial primary key,
  request_id    text not null,
  user_id       uuid references auth.users(id) on delete set null,
  task          text not null,
  model         text not null,
  provider      text not null,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  cost_usd      numeric(12, 6) not null default 0,
  latency_ms    int not null default 0,
  fallbacks     int not null default 0,
  attempts      int not null default 1,
  cached        boolean not null default false,
  ok            boolean not null default true,
  error         text,
  created_at    timestamptz not null default now()
);

-- The dashboard reads "recent usage for this user", so that is the index.
create index if not exists ai_usage_user_time_idx on ai_usage (user_id, created_at desc);
create index if not exists ai_usage_time_idx on ai_usage (created_at desc);

alter table ai_usage enable row level security;

-- Owners may read their own usage; only the service role writes it.
create policy "ai_usage_select_own" on ai_usage
  for select using (auth.uid() = user_id);

create or replace function ai_usage_record(p_usage jsonb)
returns void language sql security definer set search_path = public as $$
  insert into ai_usage (
    request_id, user_id, task, model, provider, input_tokens, output_tokens,
    cost_usd, latency_ms, fallbacks, attempts, cached, ok, error
  )
  values (
    p_usage->>'requestId',
    nullif(p_usage->>'userId', '')::uuid,
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

-- Rolled-up totals for the dashboard, so the page does not pull raw rows.
create or replace function ai_usage_summary(p_user uuid, p_since timestamptz)
returns table (
  calls bigint, cached_calls bigint, failed_calls bigint,
  input_tokens bigint, output_tokens bigint, cost_usd numeric, p50_latency_ms int
) language sql stable security definer set search_path = public as $$
  select
    count(*)::bigint,
    count(*) filter (where cached)::bigint,
    count(*) filter (where not ok)::bigint,
    coalesce(sum(input_tokens), 0)::bigint,
    coalesce(sum(output_tokens), 0)::bigint,
    coalesce(sum(cost_usd), 0)::numeric,
    coalesce(percentile_disc(0.5) within group (order by latency_ms), 0)::int
  from ai_usage
  where (p_user is null or user_id = p_user) and created_at >= p_since;
$$;

revoke all on function ai_usage_record(jsonb) from public, anon, authenticated;
revoke all on function ai_usage_summary(uuid, timestamptz) from public, anon;
grant execute on function ai_usage_record(jsonb) to service_role;
grant execute on function ai_usage_summary(uuid, timestamptz) to service_role, authenticated;
