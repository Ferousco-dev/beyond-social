-- Product analytics derived from tables we already own.
--
-- The dashboard previously rendered hardcoded view counts, which look real and
-- are not. Platform view counts need insights APIs we have not integrated, so
-- rather than invent them these functions report what is genuinely knowable:
-- how much was generated, how much succeeded, and where it was published.
--
-- Deliberately security invoker (the default) rather than definer: RLS on
-- video_generations and scheduled_posts already scopes rows to their owner, so
-- there is nothing to escalate for and no policy to re-implement here.

-- Daily generation counts over a window, with empty days present as zero so the
-- chart has a continuous axis without the client filling gaps.
create or replace function public.product_activity_daily(p_user uuid, p_days int default 7)
returns table (day date, generated bigint, ready bigint)
language sql
stable
set search_path = public
as $$
  with days as (
    select generate_series(
      (current_date - (greatest(p_days, 1) - 1)),
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    count(g.id) as generated,
    count(g.id) filter (where g.status = 'ready') as ready
  from days d
  left join video_generations g
    on g.user_id = p_user
   and g.created_at >= d.day
   and g.created_at < d.day + 1
  group by d.day
  order by d.day;
$$;

-- Published posts per platform, all time. Counts only what actually went out:
-- a scheduled post is an intention, not reach.
create or replace function public.product_platform_totals(p_user uuid)
returns table (platform text, published bigint)
language sql
stable
set search_path = public
as $$
  select p.platform::text, count(*) as published
  from scheduled_posts p
  where p.user_id = p_user
    and p.status = 'published'
  group by p.platform
  order by count(*) desc;
$$;

-- The generation funnel over a window: how many were started, how many
-- finished, how many were published. The drop between steps is the number
-- worth acting on.
create or replace function public.product_funnel(p_user uuid, p_since timestamptz)
returns table (generated bigint, ready bigint, published bigint)
language sql
stable
set search_path = public
as $$
  select
    (select count(*) from video_generations g
      where g.user_id = p_user and g.created_at >= p_since),
    (select count(*) from video_generations g
      where g.user_id = p_user and g.created_at >= p_since and g.status = 'ready'),
    (select count(*) from scheduled_posts p
      where p.user_id = p_user and p.status = 'published' and p.created_at >= p_since);
$$;

-- Drives the daily rollup, which otherwise scans a user's whole history.
create index if not exists video_generations_user_created_idx
  on public.video_generations (user_id, created_at desc);

grant execute on function public.product_activity_daily(uuid, int) to authenticated;
grant execute on function public.product_platform_totals(uuid) to authenticated;
grant execute on function public.product_funnel(uuid, timestamptz) to authenticated;
