-- Deleting the default avatar leaves someone else holding it.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -q -f supabase/tests/heygen_default_avatar_test.sql
--
-- 0096 made "the default" a database-enforced, at-most-one-per-person fact.
-- Nothing reassigned it when that row went away, so a person's library could
-- end up with no avatar marked default while generation quietly kept using
-- whichever one was newest. 0102's trigger is what this asserts.
--
-- Runs inside a transaction that is rolled back, so it leaves the database
-- exactly as it found it.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'default-avatar-test@example.com', '',
        now(), now(), now());

insert into public.heygen_avatars (id, user_id, storage_path, consent_version, training_status, is_default, created_at)
values ('88888888-8888-8888-8888-888888888888',
        '77777777-7777-7777-7777-777777777777',
        '77777777-7777-7777-7777-777777777777/first.mp4', 2, 'ready', true, now() - interval '1 hour');

insert into public.heygen_avatars (id, user_id, storage_path, consent_version, training_status, is_default, created_at)
values ('99999999-9999-9999-9999-999999999999',
        '77777777-7777-7777-7777-777777777777',
        '77777777-7777-7777-7777-777777777777/second.mp4', 2, 'ready', false, now());

\echo ''
\echo '--- deleting the default leaves the newer remaining avatar as default (must be t) ---'
delete from public.heygen_avatars where id = '88888888-8888-8888-8888-888888888888';
select is_default from public.heygen_avatars
  where id = '99999999-9999-9999-9999-999999999999';

\echo ''
\echo '--- deleting the last avatar leaves nobody default, no error ---'
delete from public.heygen_avatars where id = '99999999-9999-9999-9999-999999999999';
select count(*) as remaining from public.heygen_avatars
  where user_id = '77777777-7777-7777-7777-777777777777';

rollback;
