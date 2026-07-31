-- Carries the originating request's trace id onto the generation row.
--
-- Generating a video spans four processes: the web app starts it, an edge
-- function submits it, kie.ai renders it, and a second edge function finishes it
-- minutes later on a callback. Nothing tied those together, so "this user's
-- video failed" could not be traced back to the request that asked for it.
--
-- The row is the only thing all four touch, which makes it the right place to
-- carry the id across the asynchronous gap.

alter table public.video_generations
  add column if not exists trace_id text;

comment on column public.video_generations.trace_id is
  'W3C trace id of the request that started this generation, for correlating logs across the web app, the edge functions and the provider callback.';

-- Partial: only rows that carry an id are worth indexing, and lookups are always
-- "find the generation for this trace" rather than a range scan.
create index if not exists video_generations_trace_id_idx
  on public.video_generations (trace_id)
  where trace_id is not null;
