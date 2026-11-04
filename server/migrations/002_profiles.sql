-- One profile per Supabase Auth user. Created by the API the first time a user
-- is seen (no trigger on the auth schema), so a freshly reset database works
-- without a backfill.
create table public.profiles (
  id uuid primary key,
  email text not null default '',
  display_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
