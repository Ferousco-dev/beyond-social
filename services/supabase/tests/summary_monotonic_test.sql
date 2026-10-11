-- A summary never goes backwards.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -q -f supabase/tests/summary_monotonic_test.sql
--
-- Two overlapping refreshes both read the same message count, both decide the
-- thread has moved on, and the slower model call lands last. Before 0093 that
-- replaced a newer summary with one describing less of the conversation.
--
-- Runs inside a transaction that is rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'summary-test@example.com', '',
        now(), now(), now());

insert into public.projects (id, user_id, title)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '99999999-9999-9999-9999-999999999999', 'Summary test');

set local role service_role;

\echo ''
\echo '--- the first summary is written (must be t) ---'
select public.upsert_conversation_summary(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999',
  'covers twenty turns', now(), 20) as first_write;

\echo ''
\echo '--- a newer one moves it forward (must be t) ---'
select public.upsert_conversation_summary(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999',
  'covers thirty turns', now(), 30) as newer_write;

\echo ''
\echo '--- the slow writer lands late and is dropped (must be f) ---'
select public.upsert_conversation_summary(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999',
  'covers twenty five turns', now(), 25) as stale_write;

\echo ''
\echo 'stored summary (must be thirty), count (must be 30):'
select summary, message_count from public.conversation_summaries
  where project_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '--- re-running the same count is also a no-op (must be f) ---'
select public.upsert_conversation_summary(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999',
  'a rewrite of the same span', now(), 30) as same_count;

rollback;
