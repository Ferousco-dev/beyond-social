-- A raced decision must not silently overwrite one that already landed.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -q -f supabase/tests/prompt_candidate_status_guard_test.sql
--
-- prompt_set_candidate_status used to update unconditionally, so a reject
-- that lands after a promote already ran would overwrite "promoted" with
-- "rejected" even though the chunk was already pushed live. 0103 makes the
-- transition conditional on the caller's expected starting status and
-- reports whether it actually happened.
--
-- Runs inside a transaction that is rolled back, so it leaves the database
-- exactly as it found it.
begin;

insert into prompt_candidates (id, status, data)
values ('candidate-race-test', 'pending', '{"id": "candidate-race-test", "status": "pending"}');

\echo ''
\echo '--- first decision (promote) applies, expects pending, must be t ---'
select prompt_set_candidate_status('candidate-race-test', 'promoted', 'pending');

\echo ''
\echo '--- a second, racing decision (reject) still expects pending, must be f ---'
select prompt_set_candidate_status('candidate-race-test', 'rejected', 'pending');

\echo ''
\echo '--- the row still reads promoted, not silently overwritten (must be promoted) ---'
select status from prompt_candidates where id = 'candidate-race-test';

\echo ''
\echo '--- an unconditional caller (no expected status) still transitions, must be t ---'
select prompt_set_candidate_status('candidate-race-test', 'rejected', null);

rollback;
