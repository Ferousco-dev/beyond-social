-- The admin audit log: an append-only record of every privileged action.
--
-- Two properties make this evidence rather than a convenience log. First, it is
-- append-only in the database: policies grant no update or delete, and a trigger
-- refuses both even for roles that bypass RLS. Second, the actor's email is
-- copied in at write time, so deleting the account cannot orphan the record of
-- what that account did.

create table if not exists admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text not null,
  action      text not null check (action ~ '^[a-z0-9_.]{2,60}$'),
  target_type text not null check (target_type ~ '^[a-z0-9_.]{2,60}$'),
  target_id   text,
  summary     text not null default '',
  before      jsonb,
  after       jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);

alter table admin_audit_log enable row level security;

-- Admins read the log. There is deliberately no insert policy: writes go
-- through admin_log_action, and no policy at all can authorise update or delete.
create policy "admins read audit log" on admin_audit_log
  for select using (is_admin());

/**
 * Refuses any attempt to rewrite history. RLS already denies update and delete
 * to ordinary roles, but definer functions and the table owner bypass it, so
 * the guarantee is enforced here where nothing can route around it.
 */
create or replace function admin_audit_log_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'admin_audit_log is append-only';
end; $$;

drop trigger if exists admin_audit_log_no_rewrite on admin_audit_log;
create trigger admin_audit_log_no_rewrite
  before update or delete on admin_audit_log
  for each row execute function admin_audit_log_immutable();

/**
 * Records one admin action and returns the new row's id. Admin-gated inside the
 * function so the check cannot be forgotten at a call site.
 */
create or replace function admin_log_action(
  p_action      text,
  p_target_type text,
  p_target_id   text default null,
  p_summary     text default '',
  p_before      jsonb default null,
  p_after       jsonb default null,
  p_ip          inet default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  insert into admin_audit_log (
    actor_id, actor_email, action, target_type, target_id, summary, before, after, ip
  ) values (
    auth.uid(),
    coalesce((select u.email from auth.users u where u.id = auth.uid()), 'unknown'),
    p_action, p_target_type, p_target_id, coalesce(p_summary, ''), p_before, p_after, p_ip
  )
  returning id into v_id;

  return v_id;
end; $$;

-- The console reads the newest entries first, then filters to one actor or one
-- target when drilling into a specific account or record.
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_id, created_at desc);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id, created_at desc);

revoke update, delete on admin_audit_log from authenticated, anon;
grant execute on function admin_log_action(text, text, text, text, jsonb, jsonb, inet)
  to authenticated;
