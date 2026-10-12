-- Row-level security and the links to Supabase Auth.
--
-- Every table is reachable over PostgREST with the public anon key, so each has
-- RLS enabled and users may only read their own rows. Nothing is writable that
-- way: the Go API connects with a role that bypasses RLS and enforces ownership
-- in its own queries.
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.discoveries enable row level security;
alter table public.discovery_videos enable row level security;
alter table public.avatars enable row level security;
alter table public.avatar_handoffs enable row level security;

-- The auth schema only exists on Supabase, so plain Postgres (CI, local tests)
-- skips the parts that depend on it.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    return;
  end if;

  for t in select unnest(array['jobs', 'discoveries', 'discovery_videos', 'avatars', 'avatar_handoffs']) loop
    execute format(
      'alter table public.%I add constraint %I foreign key (user_id) references auth.users (id) on delete cascade',
      t, t || '_user_id_fkey');
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
  end loop;

  alter table public.profiles
    add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;
  create policy profiles_select_own on public.profiles
    for select to authenticated using (id = (select auth.uid()));
end
$$;
