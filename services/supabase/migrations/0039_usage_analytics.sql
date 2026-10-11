-- Usage analytics for the API Usage page.
--
-- Two read models, deliberately separate, because they answer different
-- questions and only one of them is denominated in the user's currency:
--
-- 1. `usage_generation_daily` is what the user spent. Credits come from
--    `credit_ledger`, which is the source of truth 0037 established, joined to
--    the generation that caused them. Runs come from `video_generations`. The
--    chart, the per-model breakdown, and the CSV export are all folds of this
--    one result set, so they cannot disagree.
--
-- 2. `usage_model_calls` is the reliability record from `ai_usage`: calls,
--    tokens, cache hits, latency. It carries no credit price, so it exposes
--    none. `cost_usd` there is what the provider charges us, not what the user
--    is charged, and it is not returned.
--
-- Both run as the invoker, so RLS on `video_generations`, `credit_ledger` and
-- `ai_usage` is what scopes the rows to the caller. The explicit `auth.uid()`
-- filters exist to keep the plans index-driven, not to enforce access.

create or replace function public.usage_generation_daily(p_days integer, p_tz text)
returns table (
  day date,
  model text,
  runs integer,
  succeeded integer,
  failed integer,
  credits_spent integer,
  credits_refunded integer
)
language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select
      greatest(coalesce(p_days, 30), 1) as days,
      case when p_tz is null or p_tz = '' then 'UTC' else p_tz end as tz
  ),
  window_start as (
    select
      ((date_trunc('day', timezone(b.tz, now())) - make_interval(days => b.days - 1))
        at time zone b.tz) as from_ts,
      b.tz
    from bounds b
  ),
  gens as (
    select
      g.id,
      g.model,
      g.status,
      timezone(w.tz, g.created_at)::date as day
    from public.video_generations g, window_start w
    where g.user_id = auth.uid() and g.created_at >= w.from_ts
  ),
  -- Rolled up per generation first: a run that was charged and then refunded
  -- has two ledger rows, and joining them straight onto the generation would
  -- count the run twice.
  ledger as (
    select
      l.generation_id,
      coalesce(-sum(l.delta) filter (where l.kind = 'debit'), 0) as spent,
      coalesce(sum(l.delta) filter (where l.kind = 'refund'), 0) as refunded
    from public.credit_ledger l
    where l.user_id = auth.uid() and l.generation_id is not null
    group by l.generation_id
  )
  select
    g.day,
    g.model,
    count(*)::integer,
    count(*) filter (where g.status = 'ready')::integer,
    count(*) filter (where g.status = 'failed')::integer,
    coalesce(sum(x.spent), 0)::integer,
    coalesce(sum(x.refunded), 0)::integer
  from gens g
  left join ledger x on x.generation_id = g.id
  group by g.day, g.model
  order by g.day, g.model;
$$;

create or replace function public.usage_model_calls(p_days integer)
returns table (
  task text,
  model text,
  provider text,
  calls integer,
  cached integer,
  failed integer,
  input_tokens bigint,
  output_tokens bigint,
  p50_latency_ms integer
)
language sql stable security invoker set search_path = '' as $$
  select
    u.task,
    u.model,
    u.provider,
    count(*)::integer,
    count(*) filter (where u.cached)::integer,
    count(*) filter (where not u.ok)::integer,
    coalesce(sum(u.input_tokens), 0)::bigint,
    coalesce(sum(u.output_tokens), 0)::bigint,
    coalesce(percentile_disc(0.5) within group (order by u.latency_ms), 0)::integer
  from public.ai_usage u
  where u.user_id = auth.uid()
    and u.created_at >= now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
  group by u.task, u.model, u.provider
  order by count(*) desc, u.model;
$$;

revoke all on function public.usage_generation_daily(integer, text) from public, anon;
revoke all on function public.usage_model_calls(integer) from public, anon;
grant execute on function public.usage_generation_daily(integer, text) to authenticated;
grant execute on function public.usage_model_calls(integer) to authenticated;
