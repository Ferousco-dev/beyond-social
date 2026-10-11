-- A generation cannot be filed against somebody else's project.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -q -f supabase/tests/project_access_test.sql
--
-- Both directions matter. The denied path is the finding; the allowed path is
-- the thing a trigger written against auth.uid() would have broken, since the
-- edge functions insert with the service role where auth.uid() is null.
--
-- Runs inside a transaction that is rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'owner@example.com', '', now(), now(), now()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'stranger@example.com', '', now(), now(), now());

insert into public.projects (id, user_id, title)
values ('77777777-7777-7777-7777-777777777777',
        '55555555-5555-5555-5555-555555555555', 'The owner''s project');

-- The service role is what the edge functions use, and it is the case a trigger
-- keyed on auth.uid() would have rejected.
set local role service_role;

\echo ''
\echo '--- the owner files a generation against their own project (must succeed) ---'
insert into public.video_generations (project_id, user_id, prompt)
values ('77777777-7777-7777-7777-777777777777',
        '55555555-5555-5555-5555-555555555555', 'a legitimate render');
\echo 'inserted (must be 1):'
select count(*) from public.video_generations
  where project_id = '77777777-7777-7777-7777-777777777777';

\echo ''
\echo '--- a stranger who knows the uuid files one against it (must raise) ---'
do $$
begin
  insert into public.video_generations (project_id, user_id, prompt)
  values ('77777777-7777-7777-7777-777777777777',
          '66666666-6666-6666-6666-666666666666', 'a stolen project id');
  raise exception 'FAIL: the insert was allowed';
exception
  when insufficient_privilege then
    raise notice 'PASS: refused with %', sqlerrm;
end $$;

\echo ''
\echo '--- an asset with no project is still allowed (must succeed) ---'
insert into public.assets (user_id, project_id, kind, storage_path)
values ('66666666-6666-6666-6666-666666666666', null, 'photo', 'x/y.jpg');
\echo 'inserted (must be 1):'
select count(*) from public.assets
  where user_id = '66666666-6666-6666-6666-666666666666';

\echo ''
\echo '--- an asset against a stranger''s project (must raise) ---'
do $$
begin
  insert into public.assets (user_id, project_id, kind, storage_path)
  values ('66666666-6666-6666-6666-666666666666',
          '77777777-7777-7777-7777-777777777777', 'photo', 'x/z.jpg');
  raise exception 'FAIL: the insert was allowed';
exception
  when insufficient_privilege then
    raise notice 'PASS: refused with %', sqlerrm;
end $$;

\echo ''
\echo '--- an org member reaches an org project (must succeed) ---'
insert into public.organizations (id, name, slug, created_by)
values ('88888888-8888-8888-8888-888888888888', 'A team', 'a-team',
        '55555555-5555-5555-5555-555555555555');
insert into public.organization_members (org_id, user_id, role)
values ('88888888-8888-8888-8888-888888888888',
        '66666666-6666-6666-6666-666666666666', 'member');
update public.projects set org_id = '88888888-8888-8888-8888-888888888888'
  where id = '77777777-7777-7777-7777-777777777777';

insert into public.video_generations (project_id, user_id, prompt)
values ('77777777-7777-7777-7777-777777777777',
        '66666666-6666-6666-6666-666666666666', 'a teammate''s render');
\echo 'generations on the project (must be 2):'
select count(*) from public.video_generations
  where project_id = '77777777-7777-7777-7777-777777777777';

rollback;
