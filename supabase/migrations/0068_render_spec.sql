-- What the export is actually meant to produce.
--
-- `project_renders` has existed since 0054 with a `clip_paths` array, which can
-- say which clips and in what order and nothing else. A timeline is more than an
-- order: a clip is trimmed, it may be silent, and the cut the user authored is
-- the trims as much as the sequence. Exporting from `clip_paths` alone would
-- join the full untrimmed renders end to end and call it their edit.
--
-- So the row now carries the cut itself. `clip_paths` stays, because the queue
-- and its bound on work are written against it and both are still correct, and
-- because it is the honest answer to "which objects does this job read".
--
-- Deliberately not the whole editor document. The document is the user's
-- authored state and changes shape as the editor grows; this is a job
-- instruction, and a worker should fail on something it does not understand
-- rather than silently ignore a field it was never taught.

alter table public.project_renders
  -- One entry per cut, in order: { path, startSeconds, endSeconds, volume }.
  -- Null on rows written before this existed, which the worker treats as
  -- "join the clips whole", the behaviour those rows were queued expecting.
  add column if not exists spec jsonb;

comment on column public.project_renders.spec is
  'The cut to render: ordered clips with their trims and levels. Null means join clip_paths whole.';

/*
 * The claim now hands the worker the spec as well.
 *
 * Replacing rather than adding a second function: a worker that claimed rows
 * through the old signature would move them to `generating` and then render
 * them without their trims, which is worse than not claiming them at all.
 */
drop function if exists public.claim_queued_renders(integer);

create or replace function public.claim_queued_renders(p_limit integer default 5)
returns table (id uuid, user_id uuid, clip_paths text[], spec jsonb)
language sql
volatile
security definer
set search_path = public
as $$
  update public.project_renders r
     set status = 'generating'
   where r.id in (
     select c.id
       from public.project_renders c
      where c.status = 'queued'
      order by c.created_at
      limit p_limit
      for update skip locked
   )
  returning r.id, r.user_id, r.clip_paths, r.spec;
$$;

-- Unchanged from 0054 and restated because the function was dropped: a client
-- that could claim renders would move rows into a state only the worker can
-- move them out of.
revoke all on function public.claim_queued_renders(integer) from public, authenticated;
