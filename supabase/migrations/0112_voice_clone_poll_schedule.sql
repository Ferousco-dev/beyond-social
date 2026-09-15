-- Registers the poll-voice-clone schedule, the same shape 0110 used to fix
-- 0108's HeyGen training/video polls: pg_cron and pg_net enabled for real,
-- then a cron.schedule() upsert calling the edge function on a fixed cadence.
--
-- Every 2 minutes: voice cloning has no completion webhook any more than twin
-- training does, so somebody has to ask. Faster than the 3-minute training
-- poll because a clone is the blocking step before a person can use their
-- voice in the composer at all, not a background likeness they may never
-- generate from.
--
-- Same two Vault secrets as 0110, not a third: supabase_project_url and
-- heygen_cron_secret, read by _shared/cron-auth.ts as HEYGEN_CRON_SECRET.

do $extensions$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
  else
    raise notice 'pg_cron is not installed; skipping the voice clone poll schedule.';
  end if;

  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
  else
    raise notice 'pg_net is not installed; pg_cron voice clone job will fail until it exists.';
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
    raise notice 'cron.schedule() is unavailable; skipping the voice clone poll schedule.';
    return;
  end if;

  perform cron.schedule(
    'poll-voice-clone',
    '*/2 * * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_project_url')
        || '/functions/v1/poll-voice-clone',
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
