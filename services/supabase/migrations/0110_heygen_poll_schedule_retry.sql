-- 0108 wrote the HeyGen poll schedule but the pg_cron/pg_net extensions were
-- not actually enabled on this project at the time, so its cron.schedule()
-- calls hit their own "unavailable, skipping" branch and did nothing: a
-- checked cron dump on 2026-09-15 showed no cron.job rows at all. Twin
-- training and twin video generation have had no automatic poller since
-- 0097/0079 shipped, relying only on the in-app "check now" button.
--
-- This migration enables both extensions for real and re-issues the same two
-- schedules 0108 defined. cron.schedule() upserts by job name, so this is
-- safe to run alongside 0108 rather than a conflicting duplicate.
--
-- Still true of the secrets as 0108 stated: the job bodies below name Vault
-- secrets but never contain values. Two entries must exist in Vault before
-- these jobs can succeed (see docs/heygen-polling.md):
--   supabase_project_url  -> https://<ref>.supabase.co  (no trailing slash)
--   heygen_cron_secret    -> a dedicated credential, distinct from the app's
--                            own CRON_SECRET, matching the edge functions'
--                            HEYGEN_CRON_SECRET (see _shared/cron-auth.ts)
-- Before both exist, these jobs fail visibly in cron.job_run_details rather
-- than silently doing nothing.

do $extensions$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
  else
    raise notice 'pg_cron is not installed; skipping HeyGen poll schedules (see docs/heygen-polling.md).';
  end if;

  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
  else
    raise notice 'pg_net is not installed; pg_cron HeyGen jobs will fail until it exists.';
  end if;
end
$extensions$;

do $schedules$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cron' and p.proname = 'schedule'
  ) then
    raise notice 'cron.schedule() is unavailable; skipping HeyGen poll schedules.';
    return;
  end if;

  perform cron.schedule(
    'poll-heygen-training',
    '*/3 * * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_project_url')
        || '/functions/v1/poll-heygen-training',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'heygen_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
    $job$
  );

  perform cron.schedule(
    'poll-heygen-videos',
    '*/2 * * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_project_url')
        || '/functions/v1/poll-heygen-videos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'heygen_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
    $job$
  );
end
$schedules$;
