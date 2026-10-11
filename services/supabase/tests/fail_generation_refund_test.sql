-- Refunds only happen on a real transition.
--
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" \
--     -q -f supabase/tests/fail_generation_refund_test.sql
--
-- `fail_generation_by_id` used to decline to move a finished render back to
-- `failed` and then refund it anyway, so a stale reconciliation pass credited
-- back a video the user had already been given. This is the regression test for
-- that: run it against a database with 0090 applied and every number below
-- should match its comment.
--
-- Everything runs inside a transaction that is rolled back, so it leaves the
-- database exactly as it found it.
begin;

-- A user, a project, a generation that succeeded, and the debit it was charged.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'refund-test@example.com', '',
        now(), now(), now());

insert into public.projects (id, user_id, title)
values ('33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111', 'Refund test');

insert into public.video_generations (id, project_id, user_id, prompt, status, provider_task_id)
values ('22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'a test render', 'ready', 'task-refund-test');

insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
values ('11111111-1111-1111-1111-111111111111', -1, 'video_generation',
        '22222222-2222-2222-2222-222222222222', 'debit',
        'generation:22222222-2222-2222-2222-222222222222');

\echo ''
\echo '--- a stale reconciliation pass hits a render that already succeeded ---'
select public.fail_generation_by_id(
  '22222222-2222-2222-2222-222222222222', 'stuck past threshold') as returned;

\echo ''
\echo 'status (must stay ready), refunds (must be 0), balance (must stay -1):'
select
  (select status::text from public.video_generations
     where id = '22222222-2222-2222-2222-222222222222') as status,
  (select count(*) from public.credit_ledger
     where generation_id = '22222222-2222-2222-2222-222222222222' and kind = 'refund') as refunds,
  (select coalesce(sum(delta), 0) from public.credit_ledger
     where generation_id = '22222222-2222-2222-2222-222222222222') as balance;

\echo ''
\echo '--- and the path that should still work: a genuinely stuck run ---'
update public.video_generations set status = 'generating'
  where id = '22222222-2222-2222-2222-222222222222';

select public.fail_generation_by_id(
  '22222222-2222-2222-2222-222222222222', 'stuck past threshold') as first_call;
select public.fail_generation_by_id(
  '22222222-2222-2222-2222-222222222222', 'stuck past threshold') as second_call;

\echo ''
\echo 'status (must be failed), refunds (must be exactly 1), balance (must be 0):'
select
  (select status::text from public.video_generations
     where id = '22222222-2222-2222-2222-222222222222') as status,
  (select count(*) from public.credit_ledger
     where generation_id = '22222222-2222-2222-2222-222222222222' and kind = 'refund') as refunds,
  (select coalesce(sum(delta), 0) from public.credit_ledger
     where generation_id = '22222222-2222-2222-2222-222222222222') as balance;

rollback;
