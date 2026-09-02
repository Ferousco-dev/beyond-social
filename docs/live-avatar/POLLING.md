# Why twin videos finish slowly, and what fixes it

HeyGen does not call back when a render finishes. Unlike kie, which posts to
`kie-callback`, the only way to learn that a twin video or a twin training job
is done is to ask. That is what `poll-heygen-videos` and `poll-heygen-training`
are for, and `/api/cron/poll-heygen` is what asks them.

## The constraint

The poller wants to run every few minutes. A render takes minutes, and a row
that says "generating" for an hour after the video was ready is indistinguishable
from one that failed.

It runs **once a day**.

Vercel Hobby accounts are limited to cron jobs that run once per day, and a more
frequent expression does not degrade, it **fails the deployment outright**:

> Hobby accounts are limited to daily cron jobs. This cron expression would run
> more than once per day.

That is what `*/5 * * * *` did. The number of cron jobs was never the problem;
all plans allow a hundred. The interval is.

Client-side polling does not solve it. `use-twin-video` already re-reads the row
every five seconds, but the row only moves when the poller runs, so a faster
reader of a stale row is still reading a stale row.

## What this costs today

Nothing. The twin path is already gated off: there is no `HEYGEN_API_KEY`, and
`HEYGEN_CREDIT_COST` is unset so generation refuses as unpriced. A daily poller
on a feature that cannot run is not a live problem. It becomes one the moment
the key arrives.

## The three ways out, best first

1. **Supabase `pg_cron`.** Free, no interval limit, and it lives next to the
   data it is polling about. It needs `pg_cron` and `pg_net` enabled on the
   project, and the schedule becomes a migration rather than `vercel.json`.
   This also removes the app's dependency on a Vercel plan for correctness.
2. **Vercel Pro, $20 a month.** One line: put `*/5 * * * *` back. Worth it only
   if something else on the roadmap also needs per-minute scheduling.
3. **Poll on demand from the page.** While somebody is watching their render,
   their client asks the server to poll HeyGen, with the daily cron as the
   backstop for anyone who navigated away. Free, but it puts a provider call
   behind a user-triggered endpoint, so it needs its own rate limit, and it
   does nothing for a person who closed the tab.

Recommended: **pg_cron**, before the API key arrives.
