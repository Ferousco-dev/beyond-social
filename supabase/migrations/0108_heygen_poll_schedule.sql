-- HeyGen polling moves to Supabase Cron (pg_cron + pg_net) as the primary
-- scheduler, with the Vercel cron route kept as a fallback and manual trigger.
--
-- Why this exists: the pollers (`poll-heygen-training`, `poll-heygen-videos`)
-- work when invoked, but the only thing invoking them was a Vercel cron firing
-- once a day (`15 7 * * *`). A twin that finished training sat at
-- `training_status = 'pending'` with `poll_count = 0` until somebody called the
-- route by hand. HeyGen offers no completion webhook for training or twin
-- videos, so frequent polling is the mechanism, not an optimisation.
--
-- Cadence: training every 3 minutes, videos every 2 minutes. Both pollers read
-- a bounded batch of pending rows and return immediately when there are none,
-- so an idle schedule costs one cheap indexed query per tick and zero provider
-- calls.
--
-- Secrets: the job bodies below name Vault secrets but never contain values.
-- Two entries must exist (see docs/heygen-polling.md):
--   supabase_project_url  -> https://<ref>.supabase.co  (no trailing slash)
--   heygen_cron_secret    -> the same CRON_SECRET the edge functions check
--
-- Env-specific values therefore live in Vault, not in this migration, so this
-- file runs unchanged on every environment. Before the secrets exist the jobs
-- fail visibly in cron.job_run_details rather than silently doing nothing.

-- Extensions, best effort: hosted projects and the local CLI both ship these,
-- but a database without them must still migrate cleanly. Scheduling below is
-- skipped with a notice when pg_cron is absent.
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

-- cron.schedule() upserts on the job name, so re-running this migration only
-- moves the schedules rather than duplicating them.
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
