-- A completion is announced once.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -q -f supabase/tests/complete_generation_once_test.sql
--
-- The database side was already idempotent. What was not was the caller, which
-- fired the outbound customer webhook whether or not the row had transitioned,
-- so a redelivered callback told a customer the same render finished twice.
-- `complete_generation` now reports the transition and the callback hangs the
-- webhook off that.
--
-- Runs inside a transaction that is rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'complete-test@example.com', '',
        now(), now(), now());

insert into public.projects (id, user_id, title)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Completion test');

insert into public.video_generations (id, project_id, user_id, prompt, status, provider_task_id)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'a test render', 'generating', 'task-complete-test');

\echo ''
\echo '--- the first callback settles it (must be t) ---'
select public.complete_generation('task-complete-test', 'https://x/object/sign/renders/a.mp4')
  as first_callback;

\echo ''
\echo '--- kie.ai retries the same callback (must be f) ---'
select public.complete_generation('task-complete-test', 'https://x/object/sign/renders/a.mp4')
  as retried_callback;

\echo ''
\echo 'status (must be ready), debits (must be exactly 1):'
select
  (select status::text from public.video_generations
     where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd') as status,
  (select count(*) from public.credit_ledger
     where generation_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and kind = 'debit') as debits;

\echo ''
\echo '--- an unknown task is not a completion (must be f) ---'
select public.complete_generation('task-that-does-not-exist', 'https://x/a.mp4') as unknown_task;

rollback;
