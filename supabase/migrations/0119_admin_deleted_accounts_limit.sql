/**
 * admin_deleted_accounts previously had no limit at all: it pulled every row
 * in deleted_accounts_grace on every admin Users > Deleted accounts load,
 * an unbounded query that only gets slower as the grace-period queue grows.
 * Add a capped p_limit, oldest first (the grace-period queue an admin works
 * top to bottom), with a default that keeps the panel showing what it always
 * showed for any workspace under the cap today.
 */
-- Postgres treats a new argument list as an overload, not a replacement: drop
-- the old zero-arg signature first so admin_deleted_accounts() calls resolve
-- to this one signature instead of becoming ambiguous.
drop function if exists public.admin_deleted_accounts();

create or replace function public.admin_deleted_accounts(p_limit int default 100)
returns table (
  user_id uuid, email text, full_name text, deleted_at timestamptz,
  deletion_reason text, deleted_by_email text, erasable_at timestamptz,
  days_remaining int, past_grace_period boolean
) language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
    select d.user_id, d.email, d.full_name, d.deleted_at, d.deletion_reason,
           u.email::text, d.erasable_at, d.days_remaining, d.past_grace_period
      from deleted_accounts_grace d
      left join auth.users u on u.id = d.deleted_by
     order by d.deleted_at asc
     limit greatest(p_limit, 0);
end; $$;

grant execute on function public.admin_deleted_accounts(int) to authenticated;
