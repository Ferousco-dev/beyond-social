-- User management for the admin console: lookup, one account's usage, and the
-- three actions an operator actually needs (credits, plan, suspension).
--
-- Two rules shape this file.
--
-- First, an admin sees that an account exists and how much it has used, never
-- what it wrote. No function here returns a message, a prompt, a memory, a
-- project title or a generation prompt. Counts and timestamps only. That is a
-- deliberate limit: support does not require reading someone's private work.
--
-- Second, suspension is a state the database enforces, not a flag a page reads.
-- `profiles.suspended_at` feeds `is_suspended()`, which is wired into the write
-- policies of every table a user creates rows in, so a suspended account cannot
-- start a project, send a message, upload an asset, request a generation or
-- schedule a post even if it talks straight to PostgREST with a valid token.

-- ---------------------------------------------------------------------------
-- Suspension state
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists suspended_by     uuid references auth.users(id) on delete set null;

/**
 * True when the caller's account is suspended. The single source of that
 * judgement, mirroring is_admin(): definer so it can read the profile row
 * regardless of the caller's own policies, stable so a statement evaluates it
 * once rather than per row.
 */
create or replace function public.is_suspended()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and suspended_at is not null
  );
$$;

/**
 * Refuses a user's attempt to edit their own privileged columns.
 *
 * `profiles` has an owner UPDATE policy covering every column, so without this
 * a suspended account could clear its own `suspended_at`, and any account could
 * grant itself credits or the admin role. Admin-initiated changes arrive
 * through the definer functions below, which run with the admin's auth.uid(),
 * so they pass; the Stripe webhook and the generation functions run as the
 * service role with no auth.uid() at all, so they pass too.
 */
create or replace function public.profiles_guard_privileged_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is distinct from old.id or is_admin() then
    return new;
  end if;

  if new.suspended_at is distinct from old.suspended_at
    or new.suspended_reason is distinct from old.suspended_reason
    or new.suspended_by is distinct from old.suspended_by
    or new.role is distinct from old.role
    or new.plan is distinct from old.plan
    or new.credits_total is distinct from old.credits_total
    or new.credits_used is distinct from old.credits_used
  then
    raise exception 'Those fields cannot be changed by the account holder';
  end if;

  return new;
end; $$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ---------------------------------------------------------------------------
-- Enforcement: a suspended account may read its own work but create nothing
-- ---------------------------------------------------------------------------
--
-- 0002 gave these tables one FOR ALL owner policy each. Splitting select from
-- the write commands is what lets suspension bite: the account keeps its data
-- and can still export or read it, and every path that would add to the
-- platform's cost or reach is closed.

drop policy if exists "Owners manage their projects" on public.projects;
drop policy if exists "Owners read their projects" on public.projects;
create policy "Owners read their projects" on public.projects
  for select using (auth.uid() = user_id);
drop policy if exists "Active owners write their projects" on public.projects;
create policy "Active owners write their projects" on public.projects
  for insert with check (auth.uid() = user_id and not is_suspended());
drop policy if exists "Active owners update their projects" on public.projects;
create policy "Active owners update their projects" on public.projects
  for update using (auth.uid() = user_id and not is_suspended())
  with check (auth.uid() = user_id and not is_suspended());
drop policy if exists "Owners delete their projects" on public.projects;
create policy "Owners delete their projects" on public.projects
  for delete using (auth.uid() = user_id);

drop policy if exists "Owners manage their messages" on public.messages;
drop policy if exists "Owners read their messages" on public.messages;
create policy "Owners read their messages" on public.messages
  for select using (auth.uid() = user_id);
drop policy if exists "Active owners write their messages" on public.messages;
create policy "Active owners write their messages" on public.messages
  for insert with check (auth.uid() = user_id and not is_suspended());
drop policy if exists "Owners delete their messages" on public.messages;
create policy "Owners delete their messages" on public.messages
  for delete using (auth.uid() = user_id);

drop policy if exists "Owners manage their assets" on public.assets;
drop policy if exists "Owners read their assets" on public.assets;
create policy "Owners read their assets" on public.assets
  for select using (auth.uid() = user_id);
drop policy if exists "Active owners write their assets" on public.assets;
create policy "Active owners write their assets" on public.assets
  for insert with check (auth.uid() = user_id and not is_suspended());
drop policy if exists "Owners delete their assets" on public.assets;
create policy "Owners delete their assets" on public.assets
  for delete using (auth.uid() = user_id);

drop policy if exists "Owners create their generations" on public.video_generations;
drop policy if exists "Active owners create their generations" on public.video_generations;
create policy "Active owners create their generations" on public.video_generations
  for insert with check (auth.uid() = user_id and not is_suspended());

drop policy if exists "Owners manage their scheduled posts" on public.scheduled_posts;
drop policy if exists "Owners read their scheduled posts" on public.scheduled_posts;
create policy "Owners read their scheduled posts" on public.scheduled_posts
  for select using (auth.uid() = user_id);
drop policy if exists "Active owners write their scheduled posts" on public.scheduled_posts;
create policy "Active owners write their scheduled posts" on public.scheduled_posts
  for insert with check (auth.uid() = user_id and not is_suspended());
drop policy if exists "Active owners update their scheduled posts" on public.scheduled_posts;
create policy "Active owners update their scheduled posts" on public.scheduled_posts
  for update using (auth.uid() = user_id and not is_suspended())
  with check (auth.uid() = user_id and not is_suspended());
drop policy if exists "Owners delete their scheduled posts" on public.scheduled_posts;
create policy "Owners delete their scheduled posts" on public.scheduled_posts
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Enforcement, part two: the paths that do not go through RLS
-- ---------------------------------------------------------------------------
--
-- The policies above only bind the `authenticated` role. Several server routes
-- write these tables with the service role, which bypasses RLS entirely, so a
-- suspended account that reaches the platform through its API key or through a
-- server action would still create rows. A row-level trigger runs for every
-- role, including the table owner and the service role, so the guarantee is
-- made here where nothing can route around it.
--
-- The check reads the row's own `user_id` rather than auth.uid(): in a
-- service-role request there is no authenticated user to ask about.

/**
 * Refuses a new row belonging to a suspended account.
 *
 * Insert only. A suspended account keeps everything it already had and can
 * still read, export and delete it; what stops is adding to the platform's
 * cost and reach.
 */
create or replace function public.reject_suspended_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from profiles p where p.id = new.user_id and p.suspended_at is not null
  ) then
    raise exception 'This account is suspended' using errcode = 'check_violation';
  end if;
  return new;
end; $$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'projects', 'messages', 'assets', 'video_generations', 'scheduled_posts'
  ] loop
    execute format(
      'drop trigger if exists reject_suspended_owner on public.%I', v_table);
    execute format(
      'create trigger reject_suspended_owner before insert on public.%I '
      'for each row execute function public.reject_suspended_owner()', v_table);
  end loop;
end; $$;

-- ---------------------------------------------------------------------------
-- Indexes for search and pagination
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm;

-- Keyset pagination reads this order directly, so a deep page costs the same as
-- the first one.
create index if not exists profiles_created_at_id_idx
  on public.profiles (created_at desc, id desc);

-- Operators search by a fragment of an address or a name, which no b-tree can
-- serve; trigram indexes make both sides of the OR indexed.
create index if not exists profiles_email_trgm_idx
  on public.profiles using gin (email gin_trgm_ops);
create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);

-- Last activity and per-user counts scan by owner and time; 0002 indexed
-- messages by project and generations by status, neither of which covers this.
create index if not exists messages_user_created_at_idx
  on public.messages (user_id, created_at desc);
create index if not exists video_generations_user_created_at_idx
  on public.video_generations (user_id, created_at desc);
create index if not exists projects_user_idx on public.projects (user_id);

-- ---------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------

/**
 * Searches accounts by email or name, newest signup first.
 *
 * Keyset rather than offset: the cursor is the last row's (created_at, id), so
 * paging is stable while accounts are being created underneath it and does not
 * slow down as an operator walks further back.
 */
create or replace function public.admin_search_users(
  p_query             text default '',
  p_cursor_created_at timestamptz default null,
  p_cursor_id         uuid default null,
  p_limit             int default 25
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
    and (
      p_cursor_created_at is null
      or (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by p.created_at desc, p.id desc
  limit v_limit;
end; $$;

/**
 * One account: its plan, its usage and when it was last seen.
 *
 * Counts and timestamps only. "Last active" is the most recent message or
 * generation, the same definition admin_active_users_daily uses, so the two
 * pages cannot disagree about what activity means. It undercounts an account
 * that only browsed, which is the honest reading of what this schema records.
 */
create or replace function public.admin_user_detail(p_user uuid)
returns table (
  id uuid, email text, full_name text, plan text, role text,
  credits_used int, credits_total int, credits_period_start timestamptz,
  project_count bigint, generation_count bigint, message_count bigint,
  created_at timestamptz, last_active_at timestamptz,
  suspended_at timestamptz, suspended_reason text, suspended_by_email text,
  subscription_status text, subscription_plan text,
  subscription_period_end timestamptz, subscription_cancel_at_period_end boolean
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    p.id, p.email, p.full_name, p.plan, p.role::text,
    p.credits_used, p.credits_total, p.credits_period_start,
    (select count(*) from projects pr where pr.user_id = p.id)::bigint,
    (select count(*) from video_generations g where g.user_id = p.id)::bigint,
    (select count(*) from messages m where m.user_id = p.id)::bigint,
    p.created_at,
    greatest(
      (select max(m.created_at) from messages m where m.user_id = p.id),
      (select max(g.created_at) from video_generations g where g.user_id = p.id)
    ),
    p.suspended_at, p.suspended_reason,
    (select a.email::text from auth.users a where a.id = p.suspended_by),
    s.status, s.plan, s.current_period_end, s.cancel_at_period_end
  from profiles p
  -- Stripe can leave more than one row per user over time; the newest is the
  -- one that describes the account now.
  left join lateral (
    select sub.status, sub.plan, sub.current_period_end, sub.cancel_at_period_end
    from subscriptions sub
    where sub.user_id = p.id
    order by sub.updated_at desc
    limit 1
  ) s on true
  where p.id = p_user;
end; $$;

-- ---------------------------------------------------------------------------
-- Actions. Each records its own audit row, with the before and after state.
-- ---------------------------------------------------------------------------

/** The fields an action reports as before and after. Never any content. */
create or replace function public.admin_user_snapshot(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'email', p.email,
    'plan', p.plan,
    'credits_used', p.credits_used,
    'credits_total', p.credits_total,
    'suspended_at', p.suspended_at,
    'suspended_reason', p.suspended_reason
  )
  from profiles p where p.id = p_user;
$$;

/**
 * Sets an account's credit allowance and consumption.
 *
 * The difference in allowance is written to credit_ledger as well as the audit
 * log, because the ledger is what the customer's own usage page reconciles
 * against and a grant invisible there would look like a bug to them.
 */
create or replace function public.admin_set_user_credits(
  p_user   uuid,
  p_total  int,
  p_used   int,
  p_reason text,
  p_ip     inet default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
  v_after  jsonb;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;
  if p_total < 0 or p_used < 0 then
    raise exception 'Credits cannot be negative';
  end if;

  v_before := admin_user_snapshot(p_user);
  if v_before is null then
    raise exception 'No such account';
  end if;

  update profiles set credits_total = p_total, credits_used = p_used
  where id = p_user;

  v_after := admin_user_snapshot(p_user);

  if p_total <> (v_before ->> 'credits_total')::int then
    insert into credit_ledger (user_id, delta, reason)
    values (p_user, p_total - (v_before ->> 'credits_total')::int, 'admin_adjust');
  end if;

  perform admin_log_action(
    'user.credits_adjust', 'user', p_user::text, trim(p_reason), v_before, v_after, p_ip
  );
end; $$;

/**
 * Overrides an account's plan and allowance.
 *
 * This does not touch `subscriptions`: Stripe owns that, and the next webhook
 * for this customer will reassert the plan it believes was bought. The override
 * is therefore for comping and for repair, not a substitute for billing.
 * Membership of the plan set is validated at the application boundary against
 * the plan catalogue; the shape check here only keeps junk out of the column.
 */
create or replace function public.admin_set_user_plan(
  p_user   uuid,
  p_plan   text,
  p_total  int,
  p_reason text,
  p_ip     inet default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
  v_after  jsonb;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;
  if p_plan !~ '^[a-z][a-z0-9_]{1,30}$' then
    raise exception 'Not a valid plan id';
  end if;
  if p_total < 0 then
    raise exception 'Credits cannot be negative';
  end if;

  v_before := admin_user_snapshot(p_user);
  if v_before is null then
    raise exception 'No such account';
  end if;

  update profiles set plan = p_plan, credits_total = p_total where id = p_user;
  v_after := admin_user_snapshot(p_user);

  perform admin_log_action(
    'user.plan_change', 'user', p_user::text, trim(p_reason), v_before, v_after, p_ip
  );
end; $$;

/**
 * Suspends or restores an account.
 *
 * An admin account cannot be suspended from here, including the caller's own.
 * Locking the console out of itself would need a database session to undo, and
 * removing an administrator is an identity decision rather than a support one.
 */
create or replace function public.admin_set_user_suspension(
  p_user      uuid,
  p_suspended boolean,
  p_reason    text,
  p_ip        inet default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
  v_after  jsonb;
  v_role   text;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;

  select p.role::text into v_role from profiles p where p.id = p_user;
  if v_role is null then
    raise exception 'No such account';
  end if;
  if p_suspended and v_role = 'admin' then
    raise exception 'An administrator account cannot be suspended here';
  end if;

  v_before := admin_user_snapshot(p_user);

  update profiles set
    suspended_at     = case when p_suspended then now() else null end,
    suspended_reason = case when p_suspended then trim(p_reason) else null end,
    suspended_by     = case when p_suspended then auth.uid() else null end
  where id = p_user;

  v_after := admin_user_snapshot(p_user);

  perform admin_log_action(
    case when p_suspended then 'user.suspend' else 'user.restore' end,
    'user', p_user::text, trim(p_reason), v_before, v_after, p_ip
  );
end; $$;

grant execute on function public.is_suspended() to authenticated, service_role;
grant execute on function public.admin_search_users(text, timestamptz, uuid, int) to authenticated;
grant execute on function public.admin_user_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_credits(uuid, int, int, text, inet) to authenticated;
grant execute on function public.admin_set_user_plan(uuid, text, int, text, inet) to authenticated;
grant execute on function public.admin_set_user_suspension(uuid, boolean, text, inet) to authenticated;
-- The snapshot helper exists for the actions above and reads another account's
-- profile, so nothing outside this file may call it.
revoke all on function public.admin_user_snapshot(uuid) from public, anon, authenticated;
