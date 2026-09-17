/**
 * Health board drill-down. Three changes, all additive to existing jsonb
 * columns (no argument or column-count change, so plain create or replace
 * is safe here, unlike the signature changes elsewhere in this series):
 *
 * 1. admin_stuck_pipeline / admin_failure_feed items gain trace_id and
 *    user_id, so the console can link a stuck or failed record to the Debug
 *    trace lookup and to the account it belongs to, instead of a dead-end
 *    id string.
 * 2. admin_rate_limit_pressure gains a per-scope top_keys breakdown (the
 *    individual identifiers behind an aggregate count, capped at 20 per
 *    scope by the same p_limit-style cap this file already uses elsewhere)
 *    so an admin can see *who* is close to a limit, not just how many keys
 *    exist in that scope.
 */
create or replace function public.admin_stuck_pipeline(
  p_generating_stale interval default interval '20 minutes',
  p_publishing_stale interval default interval '5 minutes',
  p_limit int default 20
)
returns table (
  observed_at timestamptz,
  generating_stuck bigint,
  publishing_stuck bigint,
  items jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
  v_generating_cutoff timestamptz := v_now - p_generating_stale;
  v_publishing_cutoff timestamptz := v_now - p_publishing_stale;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  with stuck as (
    select
      'generation'::text as kind,
      g.id,
      g.trace_id,
      g.user_id,
      g.provider || ' / ' || g.model as detail,
      g.updated_at as since
    from video_generations g
    where g.status = 'generating' and g.updated_at < v_generating_cutoff
    union all
    select
      'publish'::text,
      s.id,
      s.trace_id,
      s.user_id,
      s.platform::text,
      s.publish_started_at
    from scheduled_posts s
    where s.status = 'publishing'
      and s.publish_started_at is not null
      and s.publish_started_at < v_publishing_cutoff
  )
  select
    v_now,
    (select count(*) from stuck where kind = 'generation')::bigint,
    (select count(*) from stuck where kind = 'publish')::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(top) order by top.since)
        from (select * from stuck order by since limit greatest(p_limit, 0)) as top
      ),
      '[]'::jsonb
    );
end; $$;

create or replace function public.admin_failure_feed(
  p_since timestamptz,
  p_limit int default 20
)
returns table (
  observed_at timestamptz,
  failed_generations bigint,
  failed_posts bigint,
  items jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  with failures as (
    select
      'generation'::text as kind,
      g.id,
      g.trace_id,
      g.user_id,
      g.provider || ' / ' || g.model as detail,
      left(coalesce(g.error, ''), 200) as error,
      g.updated_at as failed_at
    from video_generations g
    where g.status = 'failed' and g.updated_at >= p_since
    union all
    select
      'publish'::text,
      s.id,
      s.trace_id,
      s.user_id,
      s.platform::text,
      left(coalesce(s.error, ''), 200),
      s.updated_at
    from scheduled_posts s
    where s.status = 'failed' and s.updated_at >= p_since
  )
  select
    v_now,
    (select count(*) from failures where kind = 'generation')::bigint,
    (select count(*) from failures where kind = 'publish')::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(top) order by top.failed_at desc)
        from (select * from failures order by failed_at desc limit greatest(p_limit, 0)) as top
      ),
      '[]'::jsonb
    );
end; $$;

create or replace function public.admin_rate_limit_pressure(p_limit int default 20)
returns table (
  observed_at timestamptz,
  active_keys bigint,
  scopes jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  with active as (
    select
      split_part(r.key, ':', 1) as scope,
      -- Only the first colon is the scope delimiter: an IPv6 identifier can
      -- itself contain colons, so the rest of the key is taken as-is.
      substr(r.key, position(':' in r.key) + 1) as identifier,
      r.count,
      r.window_end
    from rate_limits r
    where r.window_end > v_now
  ),
  grouped as (
    select
      a.scope,
      count(*)::bigint as keys,
      max(a.count)::bigint as peak_count,
      sum(a.count)::bigint as total_count,
      max(a.window_end) as window_ends_at,
      (
        select jsonb_agg(jsonb_build_object('identifier', k.identifier, 'count', k.count) order by k.count desc)
        from (
          select identifier, count from active k
          where k.scope = a.scope
          order by k.count desc
          limit 20
        ) as k
      ) as top_keys
    from active a
    group by a.scope
  )
  select
    v_now,
    (select count(*) from active)::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(top) order by top.total_count desc)
        from (select * from grouped order by total_count desc limit greatest(p_limit, 0)) as top
      ),
      '[]'::jsonb
    );
end; $$;
