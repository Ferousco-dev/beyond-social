-- Admin platform: feature flags and the read paths behind the admin console.
--
-- `profiles.role` already distinguishes admins. Everything here checks it in the
-- database rather than trusting the app, so a bug in a page cannot expose the
-- console to a normal user.

create table if not exists feature_flags (
  key         text primary key check (key ~ '^[a-z0-9_.-]{2,60}$'),
  enabled     boolean not null default false,
  description text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table feature_flags enable row level security;

/** True when the caller is an admin. The single source of that judgement. */
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Flags are readable by any signed-in user (the app needs to branch on them)
-- but writable only by admins.
create policy "signed in read flags" on feature_flags
  for select using (auth.uid() is not null);
create policy "admins write flags" on feature_flags
  for all using (is_admin()) with check (is_admin());

/**
 * Platform-wide health for the admin console. Admin-gated inside the function
 * so the check cannot be forgotten at a call site.
 */
create or replace function admin_platform_stats(p_since timestamptz)
returns table (
  users bigint, orgs bigint, generations bigint, failed_generations bigint,
  ai_calls bigint, ai_cost numeric, ai_failures bigint, cached_calls bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    (select count(*) from profiles)::bigint,
    (select count(*) from organizations)::bigint,
    (select count(*) from video_generations where created_at >= p_since)::bigint,
    (select count(*) from video_generations where created_at >= p_since and status = 'failed')::bigint,
    (select count(*) from ai_usage where created_at >= p_since)::bigint,
    (select coalesce(sum(cost_usd), 0) from ai_usage where created_at >= p_since)::numeric,
    (select count(*) from ai_usage where created_at >= p_since and not ok)::bigint,
    (select count(*) from ai_usage where created_at >= p_since and cached)::bigint;
end; $$;

/** Knowledge candidates awaiting review, for the moderation queue. */
create or replace function admin_pending_candidates(p_limit int default 20)
returns table (id text, data jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select c.id, c.data, c.created_at
  from prompt_candidates c
  where c.status = 'pending'
  order by c.created_at desc
  limit p_limit;
end; $$;

grant execute on function is_admin() to authenticated, service_role;
grant execute on function admin_platform_stats(timestamptz) to authenticated;
grant execute on function admin_pending_candidates(int) to authenticated;

insert into feature_flags (key, enabled, description) values
  ('prompt_engine', false, 'Route generations through the RAG prompt engine'),
  ('learning_autopromote', false, 'Let high-confidence learned chunks skip review'),
  ('public_api', true, 'Serve the public v1 API')
on conflict (key) do nothing;
