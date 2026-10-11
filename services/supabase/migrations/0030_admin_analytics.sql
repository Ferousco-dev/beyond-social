-- Analytics read paths for the admin console.
--
-- Every function is admin-gated inside the body, following
-- public.admin_platform_stats, so a forgotten check at a call site cannot leak
-- platform-wide numbers to a normal user.
--
-- On activity: there is no session, event or page-view table in this schema, so
-- there is no way to compute DAU the way an analytics product would. Rather
-- than invent one, "active" here means a user who did something the product
-- actually records: sent or received a message, or started a generation. That
-- is a deliberately narrower definition than a visit, and it undercounts anyone
-- who only browsed. It is real, which a placeholder would not be.
--
-- All windows are in UTC and inclusive of today. Empty days are present as zero
-- so charts get a continuous axis without the client filling gaps.

/** Days from `p_days` ago through today, clamped to a sane range. */
create or replace function public.admin_window_days(p_days int)
returns table (day date)
language sql immutable set search_path = public as $$
  select generate_series(
    current_date - (least(greatest(coalesce(p_days, 30), 1), 365) - 1),
    current_date,
    interval '1 day'
  )::date;
$$;

/** Signups per day. Profiles are created on signup, one per auth user. */
create or replace function public.admin_signups_daily(p_days int default 30)
returns table (day date, signups bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select d.day, count(p.id)::bigint
  from admin_window_days(p_days) d
  left join profiles p
    on p.created_at >= d.day and p.created_at < d.day + 1
  group by d.day
  order by d.day;
end; $$;

/**
 * Daily and monthly actives. `dau` is distinct users active on that day, `mau`
 * is distinct users active in the 30 days ending on it, so the pair can be read
 * as a stickiness ratio. See the activity caveat at the head of this file.
 */
create or replace function public.admin_active_users_daily(p_days int default 30)
returns table (day date, dau bigint, mau bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  with window_days as (select w.day from admin_window_days(p_days) w),
  activity as (
    select m.user_id, m.created_at from messages m
    union all
    select g.user_id, g.created_at from video_generations g
  ),
  scoped as (
    select a.user_id, a.created_at::date as day
    from activity a
    where a.created_at >= (select min(w.day) from window_days w) - 29
      and a.created_at < current_date + 1
  )
  select
    w.day,
    (select count(distinct s.user_id) from scoped s where s.day = w.day)::bigint,
    (select count(distinct s.user_id) from scoped s
      where s.day > w.day - 30 and s.day <= w.day)::bigint
  from window_days w
  order by w.day;
end; $$;

/** Headline totals: everyone who ever signed up, and who is paying now. */
create or replace function public.admin_user_totals()
returns table (total_users bigint, active_subscriptions bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    (select count(*) from profiles)::bigint,
    (select count(*) from subscriptions
      where status in ('active', 'trialing'))::bigint;
end; $$;

/**
 * Active subscriptions grouped by plan. Only `active` and `trialing` count as
 * live, matching the statuses that grant credits in billing_sync_subscription.
 */
create or replace function public.admin_subscriptions_by_plan()
returns table (plan text, subscriptions bigint, trialing bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    s.plan,
    count(*)::bigint,
    count(*) filter (where s.status = 'trialing')::bigint
  from subscriptions s
  where s.status in ('active', 'trialing')
  group by s.plan
  order by count(*) desc, s.plan;
end; $$;

/**
 * Video generations per day. `pending` is still queued or rendering, so on the
 * current day total will exceed succeeded plus failed until those settle.
 */
create or replace function public.admin_generations_daily(p_days int default 30)
returns table (day date, total bigint, succeeded bigint, failed bigint, pending bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    d.day,
    count(g.id)::bigint,
    count(g.id) filter (where g.status = 'ready')::bigint,
    count(g.id) filter (where g.status = 'failed')::bigint,
    count(g.id) filter (where g.status in ('queued', 'generating'))::bigint
  from admin_window_days(p_days) d
  left join video_generations g
    on g.created_at >= d.day and g.created_at < d.day + 1
  group by d.day
  order by d.day;
end; $$;

/**
 * AI spend per day. Cached calls are counted but cost nothing, so a rising
 * cache share shows up as calls climbing while cost does not.
 */
create or replace function public.admin_ai_spend_daily(p_days int default 30)
returns table (day date, cost_usd numeric, calls bigint, failed_calls bigint, cached_calls bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    d.day,
    coalesce(sum(u.cost_usd), 0)::numeric,
    count(u.id)::bigint,
    count(u.id) filter (where not u.ok)::bigint,
    count(u.id) filter (where u.cached)::bigint
  from admin_window_days(p_days) d
  left join ai_usage u
    on u.created_at >= d.day and u.created_at < d.day + 1
  group by d.day
  order by d.day;
end; $$;

/** AI spend by model over the window, most expensive first. */
create or replace function public.admin_ai_spend_by_model(p_days int default 30)
returns table (
  provider text, model text, calls bigint, cost_usd numeric,
  input_tokens bigint, output_tokens bigint, failed_calls bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    u.provider, u.model,
    count(*)::bigint,
    sum(u.cost_usd)::numeric,
    sum(u.input_tokens)::bigint,
    sum(u.output_tokens)::bigint,
    count(*) filter (where not u.ok)::bigint
  from ai_usage u
  where u.created_at >= (select min(d.day) from admin_window_days(p_days) d)
  group by u.provider, u.model
  order by sum(u.cost_usd) desc, u.model;
end; $$;

-- Activity queries scan by time across all users, which no existing index on
-- messages covers (its indexes are project- and user-scoped).
create index if not exists messages_created_at_idx on messages (created_at);
create index if not exists video_generations_created_at_idx on video_generations (created_at);
create index if not exists profiles_created_at_idx on profiles (created_at);
create index if not exists subscriptions_status_plan_idx on subscriptions (status, plan);

grant execute on function admin_window_days(int) to authenticated;
grant execute on function admin_signups_daily(int) to authenticated;
grant execute on function admin_active_users_daily(int) to authenticated;
grant execute on function admin_user_totals() to authenticated;
grant execute on function admin_subscriptions_by_plan() to authenticated;
grant execute on function admin_generations_daily(int) to authenticated;
grant execute on function admin_ai_spend_daily(int) to authenticated;
grant execute on function admin_ai_spend_by_model(int) to authenticated;
