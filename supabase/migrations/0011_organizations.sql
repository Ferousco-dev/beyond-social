-- Organizations, membership, and role-based access.
--
-- Deliberately additive: existing owner-scoped policies are left untouched, and
-- org access is added as a second, parallel policy. A project with no org keeps
-- behaving exactly as it does today, so nobody loses access to their own work.

create type org_role as enum ('owner', 'admin', 'member');

create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 80),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  org_id    uuid not null references organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      org_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on organization_members (user_id);

-- Projects may belong to an org. Null means personal, which is every row today.
alter table public.projects add column if not exists org_id uuid references organizations(id) on delete set null;
create index if not exists projects_org_idx on public.projects (org_id);

alter table organizations enable row level security;
alter table organization_members enable row level security;

/**
 * Membership test used by policies.
 *
 * SECURITY DEFINER on purpose: a policy on `organization_members` that queries
 * `organization_members` recurses. Running the lookup as the definer breaks that
 * cycle. It only ever reports on the *calling* user, so it cannot be used to
 * probe another account.
 */
create or replace function is_org_member(p_org uuid, p_min_role org_role default 'member')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where org_id = p_org
      and user_id = auth.uid()
      and case p_min_role
            when 'member' then true
            when 'admin' then role in ('owner', 'admin')
            when 'owner' then role = 'owner'
          end
  );
$$;

create policy "members read their orgs" on organizations
  for select using (is_org_member(id));
create policy "admins update their org" on organizations
  for update using (is_org_member(id, 'admin')) with check (is_org_member(id, 'admin'));
create policy "authenticated create orgs" on organizations
  for insert with check (auth.uid() = created_by);

create policy "members read the roster" on organization_members
  for select using (is_org_member(org_id));
create policy "admins manage the roster" on organization_members
  for all using (is_org_member(org_id, 'admin')) with check (is_org_member(org_id, 'admin'));

-- Second, parallel policy: org members reach org-owned projects. Personal
-- projects keep flowing through the original owner policy.
create policy "org members manage org projects" on public.projects
  for all using (org_id is not null and is_org_member(org_id))
  with check (org_id is not null and is_org_member(org_id));

/** Creates an org and makes the caller its owner, in one transaction. */
create or replace function create_organization(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  insert into organizations (name, slug, created_by)
  values (p_name, p_slug, auth.uid())
  returning id into v_id;

  insert into organization_members (org_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  return v_id;
end; $$;

/**
 * Changes a member's role. Refuses to remove the last owner, because an org
 * with no owner cannot be administered by anyone afterwards.
 */
create or replace function set_member_role(p_org uuid, p_user uuid, p_role org_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_org_member(p_org, 'admin') then
    raise exception 'Insufficient permissions';
  end if;

  if p_role <> 'owner' then
    if (select role from organization_members where org_id = p_org and user_id = p_user) = 'owner'
       and (select count(*) from organization_members where org_id = p_org and role = 'owner') = 1 then
      raise exception 'An organization must keep at least one owner';
    end if;
  end if;

  update organization_members set role = p_role where org_id = p_org and user_id = p_user;
end; $$;

grant execute on function is_org_member(uuid, org_role) to authenticated, service_role;
grant execute on function create_organization(text, text) to authenticated;
grant execute on function set_member_role(uuid, uuid, org_role) to authenticated;
