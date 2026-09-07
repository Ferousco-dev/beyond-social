-- Concurrent decisions on the same learning candidate.
--
-- prompt_set_candidate_status did an unconditional update: whichever of two
-- racing decisions on the same candidate wrote second simply overwrote the
-- first with no idea a change had already landed. A reject that lands after
-- a promote already pushed the chunk into the knowledge base leaves
-- prompt_candidates saying "rejected" while the chunk itself is live and
-- retrievable, an audit trail that disagrees with reality. The review
-- console's own submit button only guards against a second click in the same
-- tab; a second tab or a retried request race the same row.
--
-- Same compare-and-swap shape fail_generation_by_id (0090) and
-- claim_twin_training (0091, tightened by 0100) already use for this exact
-- class of race: the caller states which status it expects to find, the
-- update only applies while that still holds, and the function reports
-- whether it actually happened so a caller can tell a real transition from a
-- no-op someone else already decided.

drop function if exists public.prompt_set_candidate_status(text, text);

create function public.prompt_set_candidate_status(
  p_id text,
  p_status text,
  p_expected_status text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update prompt_candidates
    set status = p_status,
        data = jsonb_set(data, '{status}', to_jsonb(p_status)),
        updated_at = now()
    where id = p_id
      and (p_expected_status is null or status = p_expected_status)
  returning true into v_updated;

  return coalesce(v_updated, false);
end; $$;

revoke all on function public.prompt_set_candidate_status(text, text, text) from public, anon, authenticated;
grant execute on function public.prompt_set_candidate_status(text, text, text) to service_role;

comment on function public.prompt_set_candidate_status(text, text, text) is
  'Moves a learning candidate to a new status. When p_expected_status is given, the transition only applies if the row is still in that status; returns whether it actually happened, so a caller can tell a real decision from a no-op raced by another.';
