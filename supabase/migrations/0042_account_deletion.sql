-- Account deletion: a reversible flag now, a real erasure path later.
--
-- Deleting an account never wipes anything at the moment it is asked for. It
-- stamps `profiles.deleted_at` and everything the person made stays exactly
-- where it was. Two reasons. A deletion is very often a mistake or a moment of
-- frustration, and there is no undo for a cascade. And the platform still owes
-- an answer to billing disputes, abuse reports and support questions about work
-- that was already published.
--
-- Soft deletion alone is not lawful, though: GDPR erasure means the data is
-- actually gone, not hidden behind a boolean. So the flag starts a 30 day grace
-- period, after which the account is *eligible* for permanent erasure and shows
-- up in the admin console as such. This migration deliberately ships no purge
-- job. A scheduled, irreversible delete is the owner's decision to make, and
-- automating it before that decision is how data disappears by accident.
--
-- Enforcement follows the suspension precedent in 0036: the database decides,
-- not the UI. Suspension only had to stop writes, so it rides on the write
-- policies. Deletion has to stop reads as well, and rewriting the ~20 owner
-- policies to add a second predicate would touch nearly every table in the
-- schema for one condition. A RESTRICTIVE policy composes with AND against
-- whatever permissive policies already exist, so one statement per table closes
-- select, insert, update and delete at once and leaves the existing policies
-- untouched. That is what is used below.

-- ---------------------------------------------------------------------------
-- Deletion state
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists deleted_at      timestamptz,
  add column if not exists deletion_reason text,
  add column if not exists deleted_by      uuid references auth.users(id) on delete set null;

do $$
begin
  alter table public.profiles
    add constraint profiles_deletion_reason_length
      check (deletion_reason is null or char_length(deletion_reason) <= 500),
    -- The three columns describe one event, so they cannot disagree about
    -- whether it happened.
    add constraint profiles_deletion_fields_consistent
      check (deleted_at is not null or (deletion_reason is null and deleted_by is null));
exception when duplicate_object then null;
end; $$;

-- The console lists deleted accounts oldest first to work the grace period
-- queue, and the partial index keeps that scan proportional to the deleted
-- population rather than to every account on the platform.
create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at) where deleted_at is not null;

/**
 * How long a deleted account is kept before it becomes eligible for erasure.
 * A function rather than a literal so the window is stated once and the view,
 * the admin listing and any future purge cannot drift apart.
 */
create or replace function public.account_deletion_grace()
returns interval language sql immutable as $$ select interval '30 days' $$;

/**
 * True when the caller's own account is deleted. The single source of that
 * judgement, mirroring is_admin() and is_suspended(): definer so it reads the
 * profile regardless of the caller's policies, stable so a statement evaluates
 * it once rather than once per row.
 */
create or replace function public.is_account_deleted()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and deleted_at is not null
  );
$$;

/**
 * Refuses a user's attempt to edit their own privileged columns.
 *
 * Extends the 0036 guard with the deletion columns. Asking for deletion is
 * something the account holder is allowed to do, so setting `deleted_at` on a
 * live account passes; clearing it, or attributing the deletion to someone
 * else, does not. Only an admin restores, and admins return early here.
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
    or new.deleted_by is distinct from old.deleted_by
    or (old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at)
  then
    raise exception 'Those fields cannot be changed by the account holder';
  end if;

  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- Enforcement: a deleted account can neither read nor write its own rows
-- ---------------------------------------------------------------------------
--
-- One restrictive policy per owner-scoped table, ANDed with the permissive
-- owner policies that are already there. The `authenticated` role only: the
-- service role bypasses RLS regardless, and the server paths that use it
-- (webhooks, publishing workers, the admin console) must keep working on a
-- deleted account's rows so the data can still be exported or erased.

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'projects', 'messages', 'assets', 'video_generations',
    'scheduled_posts', 'credit_ledger', 'editor_documents', 'user_memories',
    'conversation_summaries', 'message_embeddings', 'api_keys',
    'user_webhooks', 'user_model_preferences', 'ai_usage'
  ] loop
    if to_regclass(format('public.%I', v_table)) is null then
      continue;
    end if;
    execute format(
      'drop policy if exists "deleted accounts are locked out" on public.%I', v_table);
    execute format(
      'create policy "deleted accounts are locked out" on public.%I '
      'as restrictive for all to authenticated using (not is_account_deleted())',
      v_table);
  end loop;
end; $$;

-- The 0036 insert trigger runs for every role, including the service role that
-- RLS never sees. Deletion is at least as disqualifying as suspension, so the
-- same trigger refuses both.
create or replace function public.reject_suspended_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from profiles p
    where p.id = new.user_id and (p.suspended_at is not null or p.deleted_at is not null)
  ) then
    raise exception 'This account is not active' using errcode = 'check_violation';
  end if;
  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- Self-service deletion
-- ---------------------------------------------------------------------------

/**
 * Flags the caller's own account as deleted and returns the resulting state.
 *
 * Definer because the restrictive policy above is about to lock this account
 * out of its own profile row, and because the audit row has to be written by a
 * caller who is not an admin.
 */
create or replace function public.request_account_deletion(p_reason text default null)
returns table (id uuid, email text, deleted_at timestamptz, deletion_reason text)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from profiles p where p.id = v_user and p.deleted_at is not null) then
    raise exception 'This account has already been deleted';
  end if;

  update profiles p
     set deleted_at = now(),
         deletion_reason = left(v_reason, 500),
         -- Null attributes the deletion to the account holder. An admin-initiated
         -- deletion records the admin here instead.
         deleted_by = null
   where p.id = v_user;

  -- Written directly rather than through admin_log_action, which is admin-only
  -- by design. The log is the record of what happened to an account, so the one
  -- action a person takes against their own account belongs in it too.
  insert into admin_audit_log (actor_id, actor_email, action, target_type, target_id, summary, after)
  select v_user,
         coalesce(u.email, 'unknown'),
         'account.deletion_requested',
         'account',
         v_user::text,
         'Account holder requested deletion',
         jsonb_build_object('deletion_reason', v_reason)
    from auth.users u where u.id = v_user;

  return query
    select p.id, p.email, p.deleted_at, p.deletion_reason
      from profiles p where p.id = v_user;
end; $$;

-- ---------------------------------------------------------------------------
-- Admin surfaces
-- ---------------------------------------------------------------------------

-- Eligibility stated once. No grants: the only reader is the definer function
-- below, which gates on is_admin() first.
create or replace view public.deleted_accounts_grace as
  select p.id                                              as user_id,
         p.email,
         p.full_name,
         p.deleted_at,
         p.deletion_reason,
         p.deleted_by,
         p.deleted_at + account_deletion_grace()           as erasable_at,
         greatest(0, ceil(
           extract(epoch from (p.deleted_at + account_deletion_grace() - now())) / 86400
         ))::int                                           as days_remaining,
         now() >= p.deleted_at + account_deletion_grace()  as past_grace_period
    from profiles p
   where p.deleted_at is not null;

/**
 * Every deleted account with where it stands in the grace period. Admin-gated
 * inside the function so the check cannot be forgotten at a call site.
 */
create or replace function public.admin_deleted_accounts()
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
     order by d.deleted_at asc;
end; $$;

/**
 * Restores a deleted account. The only way back, and audited both because it
 * returns someone's access and because it is the counterpart to a deletion the
 * log already records.
 */
create or replace function public.admin_restore_account(p_user uuid)
returns table (id uuid, email text, deleted_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  select jsonb_build_object(
           'deleted_at', p.deleted_at,
           'deletion_reason', p.deletion_reason,
           'deleted_by', p.deleted_by)
    into v_before
    from profiles p where p.id = p_user and p.deleted_at is not null;

  if v_before is null then
    raise exception 'That account is not deleted';
  end if;

  update profiles p
     set deleted_at = null, deletion_reason = null, deleted_by = null
   where p.id = p_user;

  perform admin_log_action(
    'account.restored', 'account', p_user::text,
    'Restored a deleted account', v_before,
    jsonb_build_object('deleted_at', null));

  return query select p.id, p.email, p.deleted_at from profiles p where p.id = p_user;
end; $$;

revoke all on public.deleted_accounts_grace from authenticated, anon;
grant execute on function public.is_account_deleted() to authenticated;
grant execute on function public.account_deletion_grace() to authenticated;
grant execute on function public.request_account_deletion(text) to authenticated;
grant execute on function public.admin_deleted_accounts() to authenticated;
grant execute on function public.admin_restore_account(uuid) to authenticated;
