-- Groups file library assets together under a name the person chooses: a
-- person (face and voice), a product (product shots, its place, its music).
-- An asset is in at most one group; deleting a group keeps its assets.
create table public.library_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index library_groups_name_idx on public.library_groups (user_id, lower(name));

alter table public.library_groups enable row level security;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute
      'alter table public.library_groups add constraint library_groups_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade';
    execute
      'create policy library_groups_select_own on public.library_groups for select to authenticated using (user_id = (select auth.uid()))';
  end if;
end
$$;

alter table public.library_assets
  add column group_id uuid references public.library_groups (id) on delete set null;
create index library_assets_group_idx on public.library_assets (group_id) where group_id is not null;

-- Every avatar group someone already made becomes a library group, holding the
-- library copies of its files (made by 041), so nothing has to be filed again.
insert into public.library_groups (user_id, name, created_at)
select g.user_id, g.name, g.created_at
from public.asset_groups g
on conflict do nothing;

update public.library_assets a
set group_id = lg.id
from public.asset_groups g
join public.library_groups lg on lg.user_id = g.user_id and lower(lg.name) = lower(g.name)
where a.user_id = g.user_id
  and a.group_id is null
  and (
    a.media_id::text in (g.face_id, g.voice_id, g.product_id, g.environment_id)
    or a.media_id::text in (select extra ->> 'id' from jsonb_array_elements(g.extras) as extra)
  );
