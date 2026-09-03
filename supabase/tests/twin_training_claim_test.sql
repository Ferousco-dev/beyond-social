-- One training dispatch per twin.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -q -f supabase/tests/twin_training_claim_test.sql
--
-- `train-heygen-avatar` had nothing between writing the row and calling HeyGen,
-- so a retry dispatched a second training job and left a separately trained copy
-- of somebody's face at the provider with nothing pointing at it. `claim_twin_
-- training` is what a second dispatch now loses against, scoped to the row
-- being trained since 0100, not to whoever owns it. Run this against a
-- database with 0100 applied; every number should match its comment.
--
-- Runs inside a transaction that is rolled back, so it leaves the database
-- exactly as it found it.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'twin-test@example.com', '',
        now(), now(), now());

insert into public.heygen_avatars (id, user_id, storage_path, consent_version, training_status)
values ('55555555-5555-5555-5555-555555555555',
        '44444444-4444-4444-4444-444444444444',
        '44444444-4444-4444-4444-444444444444/footage.mp4', 2, 'pending');

\echo ''
\echo '--- two dispatches racing on the same twin ---'
\echo 'first (must be t), second (must be f):'
select
  public.claim_twin_training(
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    'aaaaaaaa-0000-0000-0000-000000000001') as first,
  public.claim_twin_training(
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    'aaaaaaaa-0000-0000-0000-000000000002') as second;

\echo ''
\echo 'the winning request id is the one stored (must be ...0001):'
select training_request_id from public.heygen_avatars
  where id = '55555555-5555-5555-5555-555555555555';

\echo ''
\echo '--- a finished attempt does not block a re-record (must be t) ---'
update public.heygen_avatars set training_status = 'ready'
  where id = '55555555-5555-5555-5555-555555555555';
select public.claim_twin_training(
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-0000-0000-0000-000000000003') as after_ready;

\echo ''
\echo '--- a dispatch that died mid-flight is reclaimable (must be f then t) ---'
update public.heygen_avatars
  set training_status = 'pending', training_claimed_at = now()
  where id = '55555555-5555-5555-5555-555555555555';
select public.claim_twin_training(
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-0000-0000-0000-000000000004') as while_fresh;

update public.heygen_avatars set training_claimed_at = now() - interval '1 hour'
  where id = '55555555-5555-5555-5555-555555555555';
select public.claim_twin_training(
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-0000-0000-0000-000000000005') as once_stale;

\echo ''
\echo '--- a second twin is untouched by the first one''s claim (must be t, then null) ---'
insert into public.heygen_avatars (id, user_id, storage_path, consent_version, training_status)
values ('66666666-6666-6666-6666-666666666666',
        '44444444-4444-4444-4444-444444444444',
        '44444444-4444-4444-4444-444444444444/second.mp4', 2, 'pending');
select public.claim_twin_training(
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-0000-0000-0000-000000000006') as claims_first_twin_only;
select training_request_id from public.heygen_avatars
  where id = '66666666-6666-6666-6666-666666666666';

\echo ''
\echo '--- a displaced group is recorded so deletion can reach it ---'
-- orphan_twin_avatar has no caller anywhere in the app today (see
-- BACKLOG.md); still scoped by user_id rather than by row, same bug
-- claim_twin_training had. Left as found: fixing an unreachable function's
-- scoping teaches nothing until something actually calls it. Scoped to one
-- row below so this assertion is not itself misread as proof it is row-safe.
select public.orphan_twin_avatar('44444444-4444-4444-4444-444444444444', 'group-abc');
select public.orphan_twin_avatar('44444444-4444-4444-4444-444444444444', 'group-abc');
select public.orphan_twin_avatar('44444444-4444-4444-4444-444444444444', 'group-def');

\echo 'orphans (must be exactly 2, deduplicated):'
select array_length(orphaned_provider_avatar_ids, 1) as orphans
  from public.heygen_avatars where id = '55555555-5555-5555-5555-555555555555';

rollback;
