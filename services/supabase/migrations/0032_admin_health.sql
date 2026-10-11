-- Read paths behind the admin health console.
--
-- Every function here is admin-gated in the database rather than at the call
-- site, following 0013_admin.sql, and every one of them returns `observed_at`
-- from the database clock. A monitoring panel that cannot say when its numbers
-- were taken is a way to look at yesterday and believe it is now, and the app
-- clock is the wrong source: a cached render would report the time of the read
-- that never happened.
--
-- Each function returns exactly one row, with any list of items as a jsonb
-- array. One row means the timestamp is present even when nothing is wrong,
-- which is precisely the case a monitoring view has to render honestly.

/**
 * Work that entered a transient state and never left it.
 *
 * A generation sitting in 'generating' past the threshold means the kie.ai
 * callback never arrived. A post sitting in 'publishing' with an old
 * publish_started_at means a worker died between claiming the row and
 * finishing, so the platform may or may not already have the video.
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
      g.provider || ' / ' || g.model as detail,
      g.updated_at as since
    from video_generations g
    where g.status = 'generating' and g.updated_at < v_generating_cutoff
    union all
    select
      'publish'::text,
      s.id,
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

/**
 * Terminal failures in the window, newest first. `error` is the operator's only
 * clue about why, so it is returned, truncated: these strings are provider
 * output and can be long, and nothing downstream needs more than the shape of
 * the message.
 */
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
      g.provider || ' / ' || g.model as detail,
      left(coalesce(g.error, ''), 200) as error,
      g.updated_at as failed_at
    from video_generations g
    where g.status = 'failed' and g.updated_at >= p_since
    union all
    select
      'publish'::text,
      s.id,
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

/**
 * AI reliability by provider and model. Grouped rather than listed, because the
 * question an operator asks during an incident is "which provider is down",
 * and a list of individual calls does not answer it.
 */
create or replace function public.admin_ai_failures(
  p_since timestamptz,
  p_limit int default 20
)
returns table (
  observed_at timestamptz,
  calls bigint,
  failures bigint,
  providers jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  with window_usage as (
    select * from ai_usage where created_at >= p_since
  ),
  grouped as (
    select
      u.provider,
      u.model,
      count(*)::bigint as calls,
      count(*) filter (where not u.ok)::bigint as failures,
      max(u.created_at) filter (where not u.ok) as last_failed_at,
      left(
        coalesce(
          (
            select f.error from window_usage f
            where f.provider = u.provider and f.model = u.model and not f.ok
            order by f.created_at desc limit 1
          ),
          ''
        ),
        200
      ) as last_error
    from window_usage u
    group by u.provider, u.model
    having count(*) filter (where not u.ok) > 0
  )
  select
    v_now,
    (select count(*) from window_usage)::bigint,
    (select count(*) from window_usage where not ok)::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(top) order by top.failures desc)
        from (select * from grouped order by failures desc limit greatest(p_limit, 0)) as top
      ),
      '[]'::jsonb
    );
end; $$;

/**
 * Rate limit pressure, aggregated by key scope only.
 *
 * A rate limit key is "scope:identifier", and the identifier is an IP or a user
 * id. Returning raw keys would turn a health panel into a log of who is being
 * throttled, so only the scope before the first colon leaves the database.
 * Expired windows are excluded: they are history, not pressure.
 */
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
    select split_part(r.key, ':', 1) as scope, r.count, r.window_end
    from rate_limits r
    where r.window_end > v_now
  ),
  grouped as (
    select
      a.scope,
      count(*)::bigint as keys,
      max(a.count)::bigint as peak_count,
      sum(a.count)::bigint as total_count,
      max(a.window_end) as window_ends_at
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

/**
 * Cache health.
 *
 * `response_cache` has no hit counter, so a hit rate cannot be derived from the
 * table itself: it can only report how much live content it holds and how much
 * has expired without being swept. The hit rate that is real comes from
 * ai_usage.cached, which is written on every call, hit or miss.
 */
create or replace function public.admin_cache_health(p_since timestamptz)
returns table (
  observed_at timestamptz,
  live_entries bigint,
  expired_entries bigint,
  newest_entry_at timestamptz,
  embedding_entries bigint,
  ai_calls bigint,
  cached_calls bigint
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    v_now,
    (select count(*) from response_cache where expires_at > v_now)::bigint,
    (select count(*) from response_cache where expires_at <= v_now)::bigint,
    (select max(created_at) from response_cache),
    (select count(*) from embedding_cache)::bigint,
    (select count(*) from ai_usage where created_at >= p_since)::bigint,
    (select count(*) from ai_usage where created_at >= p_since and cached)::bigint;
end; $$;

grant execute on function public.admin_stuck_pipeline(interval, interval, int) to authenticated;
grant execute on function public.admin_failure_feed(timestamptz, int) to authenticated;
grant execute on function public.admin_ai_failures(timestamptz, int) to authenticated;
grant execute on function public.admin_rate_limit_pressure(int) to authenticated;
grant execute on function public.admin_cache_health(timestamptz) to authenticated;
