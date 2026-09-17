-- Per-user credit spend: a daily timeline for the detail page's chart, and a
-- by-model breakdown mirroring admin_ai_spend_by_model's shape but scoped to
-- one account instead of the whole platform.
--
-- "Spend" here means debits: negative credit_ledger.delta rows, regardless of
-- reason (video_generation is the only writer today, but a future debit
-- reason should show up here without a migration). An admin credit grant or
-- correction is a positive delta and is not spend.

/**
 * Credits an account spent per day over the window, zero-filled.
 *
 * TrendChart positions points purely by array index, evenly spaced — it has
 * no notion of the calendar date a point falls on, so it is only correct
 * when the caller already returns one row per day in the window. A plain
 * `group by created_at::date` on a sparse ledger (most days have no debit at
 * all) would silently violate that and plot real gaps as adjacent points.
 * admin_signups_daily faces the identical sparse-source problem for a day
 * with zero signups, so this mirrors its admin_window_days left join instead
 * of inventing a second way to zero-fill a day series.
 */
create or replace function public.admin_user_credit_spend_daily(
  p_user uuid,
  p_days int default 30
)
returns table (
  day date,
  credits_spent bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select d.day, coalesce(sum(-l.delta), 0)::bigint
  from admin_window_days(p_days) d
  left join credit_ledger l
    on l.user_id = p_user
    and l.delta < 0
    and l.created_at >= d.day and l.created_at < d.day + 1
  group by d.day
  order by d.day;
end; $$;

/** One account's spend by provider/model over the window, most expensive first. */
create or replace function public.admin_user_credit_spend_by_model(
  p_user uuid,
  p_days int default 30
)
returns table (
  provider text,
  model text,
  generations bigint,
  credits_spent bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select g.provider, g.model, count(*)::bigint, sum(-l.delta)::bigint
  from credit_ledger l
  join video_generations g on g.id = l.generation_id
  where l.user_id = p_user
    and l.delta < 0
    and l.created_at >= now() - (greatest(p_days, 1) || ' days')::interval
  group by g.provider, g.model
  order by sum(-l.delta) desc;
end; $$;

grant execute on function public.admin_user_credit_spend_daily(uuid, int) to authenticated;
grant execute on function public.admin_user_credit_spend_by_model(uuid, int) to authenticated;
