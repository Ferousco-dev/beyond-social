-- A conversation summary only ever moves forward.
--
-- `updateSummary` read the stored `message_count`, spent a model call deciding
-- whether the thread had moved on enough, and then upserted. Two refreshes
-- overlapping, which is ordinary on a busy thread because the write runs after
-- the response is already on its way, both read the same count, both decide to
-- summarise, and the slower model call lands last. The newer summary is then
-- overwritten by one describing less of the conversation, and the count goes
-- backwards with it.
--
-- Nothing is lost that cannot be recomputed, which is why this is the least
-- severe of the idempotency findings. What it costs is the summary silently
-- describing an older conversation than the one being had, and a model call
-- paid for and thrown away.
--
-- Expressed as one statement rather than as versioning in the app: the compare
-- and the write have to happen together or the race just moves.

create or replace function public.upsert_conversation_summary(
  p_project uuid,
  p_user uuid,
  p_summary text,
  p_covered_through timestamptz,
  p_message_count int
)
returns boolean
language plpgsql
-- Invoker, deliberately. A definer function would bypass the RLS policy on
-- conversation_summaries, and that policy is the only thing deciding whose
-- summary a caller may write.
security invoker
set search_path to ''
as $$
declare
  v_written boolean;
begin
  insert into public.conversation_summaries
    (project_id, user_id, summary, covered_through, message_count, updated_at)
  values (p_project, p_user, p_summary, p_covered_through, p_message_count, now())
  on conflict (project_id) do update
    set summary = excluded.summary,
        covered_through = excluded.covered_through,
        message_count = excluded.message_count,
        updated_at = now()
    -- The whole fix. A write describing fewer messages than the row already
    -- holds is a slow model call landing behind a fast one, and it is dropped.
    where public.conversation_summaries.message_count < excluded.message_count
  returning true into v_written;

  return coalesce(v_written, false);
end; $$;

revoke all on function public.upsert_conversation_summary(uuid, uuid, text, timestamptz, int)
  from public, anon;
grant execute on function public.upsert_conversation_summary(uuid, uuid, text, timestamptz, int)
  to authenticated, service_role;

comment on function public.upsert_conversation_summary(uuid, uuid, text, timestamptz, int) is
  'Writes a conversation summary only when it covers more messages than the stored one. Returns whether it was written.';
