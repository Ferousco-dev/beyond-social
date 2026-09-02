-- One submitted turn runs once.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -q -f supabase/tests/idempotency_claim_test.sql
--
-- The stream route keeps a disconnected turn running to completion, and the
-- client falls back to the server action with the same payload, so a dropped
-- connection used to run the whole turn twice and pay for two renders. The
-- client now names the submission and the first caller to claim that name is
-- the one that runs.
--
-- `claim_idempotency_key` reads auth.uid() itself, so the tests below set a
-- JWT claim rather than a role: that is the identity the function scopes to,
-- and proving one user cannot collide with another is half the point.
--
-- Runs inside a transaction that is rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'idem-one@example.com', '', now(), now(), now()),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'idem-two@example.com', '', now(), now(), now());

set local role authenticated;
set local request.jwt.claim.sub = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

\echo ''
\echo '--- the stream attempt claims the submission (must be t) ---'
select public.claim_idempotency_key('chat-turn', 'e1111111-1111-1111-1111-111111111111')
  as stream_attempt;

\echo ''
\echo '--- the fallback retries the same payload (must be f) ---'
select public.claim_idempotency_key('chat-turn', 'e1111111-1111-1111-1111-111111111111')
  as action_fallback;

\echo ''
\echo '--- a different submission is unaffected (must be t) ---'
select public.claim_idempotency_key('chat-turn', 'e2222222-2222-2222-2222-222222222222')
  as next_message;

\echo ''
\echo '--- the same key in another scope is a different claim (must be t) ---'
select public.claim_idempotency_key('some-other-feature', 'e1111111-1111-1111-1111-111111111111')
  as other_scope;

\echo ''
\echo '--- another user is not blocked by this one''s key (must be t) ---'
set local request.jwt.claim.sub = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
select public.claim_idempotency_key('chat-turn', 'e1111111-1111-1111-1111-111111111111')
  as other_user;

\echo ''
\echo '--- a claim that died mid-turn is reclaimable (must be t) ---'
-- Aged through a role that can see the table: RLS is enabled on it with no
-- policy at all, so an `authenticated` update here would silently match nothing
-- and the test would prove the opposite of what it says.
set local role postgres;
update public.idempotency_claims set claimed_at = now() - interval '1 hour'
  where user_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
set local role authenticated;

select public.claim_idempotency_key('chat-turn', 'e1111111-1111-1111-1111-111111111111')
  as after_stale;

rollback;
