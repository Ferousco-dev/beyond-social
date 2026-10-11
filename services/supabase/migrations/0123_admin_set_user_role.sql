-- admin_user_snapshot gains role so a role change's audit before/after
-- actually shows the role, not just the fields the other admin_set_* actions
-- already cared about. Additive: every existing caller just gets one more
-- key in the jsonb it already builds and compares selectively.
create or replace function public.admin_user_snapshot(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'email', p.email,
    'plan', p.plan,
    'role', p.role,
    'credits_used', p.credits_used,
    'credits_total', p.credits_total,
    'suspended_at', p.suspended_at,
    'suspended_reason', p.suspended_reason
  )
  from profiles p where p.id = p_user;
$$;

/**
 * Promotes or demotes an account between 'user' and 'admin'.
 *
 * Higher stakes than a suspension: this hands out or takes away access to
 * every admin function in this console, including this one. Two refusals
 * mirror admin_set_user_suspension's own self-protection, extended to the
 * case suspension never had to consider (a role has more than one admin who
 * could each be the last):
 *
 *  - A caller cannot change their own role here. Locking the console out of
 *    itself, or quietly promoting yourself further, both need a database
 *    session to undo either way, so neither happens through this RPC.
 *  - The last remaining admin cannot be demoted. Suspension already refuses
 *    to touch any admin at all; a role change is more surgical, so instead of
 *    blanket-refusing every admin, this refuses only the demotion that would
 *    leave zero admins able to run this console at all.
 */
create or replace function public.admin_set_user_role(
  p_user   uuid,
  p_role   text,
  p_reason text,
  p_ip     inet default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_before      jsonb;
  v_after       jsonb;
  v_role        text;
  v_admin_count int;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'Not a valid role';
  end if;
  if p_user = auth.uid() then
    raise exception 'Cannot change your own role here';
  end if;

  select p.role::text into v_role from profiles p where p.id = p_user;
  if v_role is null then
    raise exception 'No such account';
  end if;

  if v_role = p_role then
    -- A no-op write would add an audit row saying nothing changed.
    return;
  end if;

  if v_role = 'admin' and p_role = 'user' then
    select count(*) into v_admin_count from profiles where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'Cannot demote the last remaining admin';
    end if;
  end if;

  v_before := admin_user_snapshot(p_user);

  update profiles set role = p_role::user_role where id = p_user;

  v_after := admin_user_snapshot(p_user);

  perform admin_log_action(
    'user.role_set', 'user', p_user::text, trim(p_reason), v_before, v_after, p_ip
  );
end; $$;

grant execute on function public.admin_set_user_role(uuid, text, text, inet) to authenticated;
