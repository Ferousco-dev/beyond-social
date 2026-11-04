-- Asset groups: named bundles of face, voice, product and environment media
-- plus extras, one per video concept (avatar001, avatar002, ...). Names are
-- unique per user; storage objects already live under per-user folders.
create table public.asset_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 40),
  face_id text not null default '',
  voice_id text not null default '',
  product_id text not null default '',
  environment_id text not null default '',
  extras jsonb not null default '[]'::jsonb,
  face_consent_at timestamptz,
  voice_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index asset_groups_user_idx on public.asset_groups (user_id, created_at desc);

alter table public.asset_groups enable row level security;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute
      'alter table public.asset_groups add constraint asset_groups_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade';
    execute
      'create policy asset_groups_select_own on public.asset_groups for select to authenticated using (user_id = (select auth.uid()))';
  end if;
end
$$;
