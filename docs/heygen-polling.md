# HeyGen Background Polling

HeyGen offers no completion webhook for the slow operations this app uses:
training a Digital Twin, rendering a video of one, and cloning a voice. Something must ask,
repeatedly, until each finishes. That something is two Supabase Edge Functions
run on a schedule, plus a per-user "Check now" escape hatch.

## How it is scheduled

| Layer                   | What                                                                          | Cadence                         |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| Supabase Cron (primary) | `poll-heygen-training` edge function, via pg_cron + pg_net (migration `0108`) | every 3 minutes                 |
| Supabase Cron (primary) | `poll-heygen-videos` edge function, via pg_cron + pg_net (migration `0108`)   | every 2 minutes                 |
| Supabase Cron (primary) | `poll-voice-clone` edge function, via pg_cron + pg_net (migration `0112`)    | every 2 minutes                 |
| Vercel Cron (backstop)  | `/api/cron/poll-heygen`, which invokes all three pollers                    | every 5 minutes                 |
| User action (recovery)  | `checkTwinNow` server action, "Check now" button on the training screen       | on demand, 5 per 5 min per user |

Supabase Cron is the primary scheduler for HeyGen polling, with the Vercel route
as a backstop. The pollers are idempotent
(settled video rows are refused by `complete_generation` / `fail_generation_by_id`;
training updates converge), so multiple manual invocations only cost an extra
provider read, never a wrong state.

Each tick is cheap when idle: one indexed pending-rows read per function, and
zero HeyGen calls when nothing is pending. Batches are bounded at 20 rows,
oldest first.

## Required secrets

Supabase edge function secrets (only the edge functions call HeyGen):

```
supabase secrets set HEYGEN_API_KEY=... CRON_SECRET=<random-string> HEYGEN_CREDIT_COST=10 VOICE_CLONE_CREDIT_COST=10
```

`CRON_SECRET` is the shared secret the pollers check on the `x-cron-secret`
header. It must match in three places: the Supabase function secrets, the
Vercel/app server env (`CRON_SECRET`), and Vault (below). `HEYGEN_API_KEY`
stays backend-only; neither it nor `CRON_SECRET` nor the service role key may
reach frontend JavaScript (all three are server env / function secrets only).

Vault entries for pg_cron (names matter, values are per environment):

```sql
select vault.create_secret('https://<ref>.supabase.co', 'supabase_project_url');
select vault.create_secret('<the-same-CRON_SECRET>', 'heygen_cron_secret');
```

App / Vercel env (server-side only):

```
CRON_SECRET=...                 # same value as above
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # lets the cron route and check-now invoke the functions
```

After deploying the functions, confirm the JWT settings: `poll-heygen-training`,
`poll-heygen-videos`, and `poll-voice-clone` run with `verify_jwt = false` (declared in
`supabase/config.toml`) because pg_cron is a service caller with no user JWT;
authentication is the `x-cron-secret` check inside each function.

## Manual setup still required

`supabase db push` creates the three schedules automatically when pg_cron and
pg_net exist (migration `0108` skips with a notice otherwise). After pushing:

1. Create the two Vault secrets above (they cannot live in a migration).
2. Deploy the functions: `supabase functions deploy poll-heygen-training
poll-heygen-videos poll-voice-clone` and set their secrets.
3. Verify: `select jobname, schedule, active from cron.job;` should list
   `poll-heygen-training` (`*/3 * * * *`), `poll-heygen-videos`, and
   `poll-voice-clone` (`*/2 * * * *`).
4. Watch one run: `select * from cron.job_run_details order by start_time desc
limit 5;` and confirm `status = 'Succeeded'`. A failure naming
   `vault.decrypted_secrets` means step 1 was missed.

Local development: the local CLI stack may not run pg_cron jobs. Polling still
works via `GET /api/cron/poll-heygen` with the cron secret.

## Manual trigger (optional, for operators)

If you need to manually trigger polling outside the Supabase schedule, the Vercel
route is available but no longer active by default:

```bash
curl -i https://<app-domain>/api/cron/poll-heygen \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `{"ok":true,"poll-heygen-training":{"checked":N,...},"poll-heygen-videos":{...},"poll-voice-clone":{...}}`.
`checked: 0` with no `reason` means no pending rows, not a broken poller.
Never call the edge functions from a browser or log the secret.

## Expected processing times

Training a twin takes HeyGen minutes, not seconds. With Supabase Cron,
a finished twin is marked `ready` within about 3 minutes of HeyGen completing
it, a voice clone within about 2 minutes, and a finished twin video within about 2 minutes. A row still `pending` with
a rising `poll_count` and a recent `updated_at` is healthy and waiting on HeyGen,
not stuck.

Give-up rules (so nothing waits forever): training fails with a
`provider_error` after 60 checks (about 3 hours on the primary schedule);
twin videos fail and refund after 60 minutes at `generating`.

## Troubleshooting stuck avatars/videos

1. Read the row: `training_status`, `poll_count`, `updated_at`,
   `provider_error`, `provider_consent_status` on `heygen_avatars`.
2. `poll_count = 0` and `updated_at` hours old means the schedulers never ran:
   check `cron.job` / `cron.job_run_details`, the Vault secrets, and that
   `CRON_SECRET` matches in all three places.
3. `provider_consent_status = pending_consent` means HeyGen is waiting on the
   person, not on us: send them back to the hosted consent page ("Continue to
   HeyGen"), not to polling.
4. `provider_error` set with status `failed` is terminal and honest: record
   again. Re-recording is safe; the dispatch claim prevents duplicate provider
   jobs.
5. Voice clones stuck at `pending` with a rising `poll_count` are being checked;
   a flat `poll_count` means the scheduler or its secret is broken. Videos stuck
   at `generating` with no `provider_task_id` were never dispatched; videos with
   one are polled every 2 minutes and refunded on failure via
   `fail_generation_by_id`.
6. A user waiting on a spinner can tap "Check now" on the training screen
   (5 checks per 5 minutes per user). It only invokes the pollers when that
   user actually has pending rows.

## Audit report (what was broken, and what exists now)

1. **What was broken?** Scheduling, not creation. The twin was created
   correctly (`provider_avatar_id`, `provider_look_id`, `provider_voice_id`
   stored), but nothing asked HeyGen about it afterwards.
2. **Why did the avatar stay pending?** The previous trigger was Vercel cron at
   `15 7 * * *` (once daily). The current primary schedules are in Supabase Cron,
   with the Vercel route as a five-minute backstop.
3. **Which background jobs exist now?** `poll-heygen-training`,
   `poll-heygen-videos`, and `poll-voice-clone` (edge), plus the pre-existing `kie-callback` webhook,
   `poll-generation` (user-authenticated single sync), `reconcile-generations`
   sweep, BullMQ publish/render schedulers (30s / 5s), and the daily
   retention / prune-caches / discover-trends crons.
4. **Which scheduler triggers each one?** pg_cron for the three HeyGen pollers,
   with the Vercel route as a backstop;
   kie.ai pushes to the webhook; BullMQ schedulers run inside the worker process.
5. **What cadence?** Training every 3 min, videos and voice clones every 2 min (Supabase Cron).
6. **Which secrets?** `HEYGEN_API_KEY` (edge only), `CRON_SECRET` (edge +
   app server + Vault), service role key (app server only).
7. **How is the flow secured?** Edge functions run `verify_jwt = false` and
   check `x-cron-secret` in constant-time fashion against `CRON_SECRET`;
   pending-row RPCs are `SECURITY DEFINER` granted to `service_role` only;
   avatar rows are RLS owner-scoped; "Check now" requires a session and is
   rate-limited per user.
8. **How do we know polling is working?** Edge logs emit
   `checked/ready/failed` per run; `poll_count` and `updated_at` rise on
   pending rows; `cron.job_run_details` shows per-tick status.
9. **How can a user recover from stuck pending?** Wait (the schedule checks
   every few minutes), tap "Check now", complete hosted consent if asked, or
   re-record if the row failed with an error.
10. **What still needs manual infrastructure setup?** The two Vault secrets,
    deploying the three poller functions with their secrets, and confirming the
    cron jobs exist and succeed (steps 1-4 above).
