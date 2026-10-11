/**
 * admin_search_users gains an optional plan filter so the Users console can
 * show a Creator or Studio tab instead of only ever showing everyone. Kept
 * backward compatible: p_plan is appended last with a null default, so every
 * existing 4-arg call (searchUsers's current callers) is unaffected and still
 * returns every plan, same as today.
 *
 * Postgres treats a changed argument list as a new overload rather than a
 * replacement of the old one, so the previous 4-arg signature is dropped
 * first — otherwise both would exist and a 4-arg call would stay pinned to
 * the old function instead of picking up the new optional parameter.
 */
drop function if exists public.admin_search_users(text, timestamptz, uuid, int);

create or replace function public.admin_search_users(
  p_query             text default '',
  p_cursor_created_at timestamptz default null,
  p_cursor_id         uuid default null,
  p_limit             int default 25,
  p_plan              text default null
) returns table (
  id uuid, email text, full_name text, plan text, role text,
  credits_used int, credits_total int,
  suspended_at timestamptz, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare
  v_pattern text;
  v_limit   int := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  if p_cursor_created_at is not null and p_cursor_id is null then
    raise exception 'A cursor needs both a timestamp and an id';
  end if;

  -- LIKE metacharacters in operator input match rather than filter, so they are
  -- escaped before the fragment becomes a pattern.
  v_pattern := '%' || replace(replace(replace(
    coalesce(p_query, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select p.id, p.email, p.full_name, p.plan, p.role::text,
         p.credits_used, p.credits_total, p.suspended_at, p.created_at
  from profiles p
  where (
      coalesce(p_query, '') = ''
      or p.email ilike v_pattern
      -- Compared bare rather than wrapped in coalesce: a null name yields null,
      -- which the OR discards exactly like false, and an expression the
      -- trigram index cannot match would force a sequential scan.
      or p.full_name ilike v_pattern
    )
    and (p_plan is null or p.plan = p_plan)
    and (
      p_cursor_created_at is null
      or (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit v_limit;
end; $$;

grant execute on function public.admin_search_users(text, timestamptz, uuid, int, text) to authenticated;
