-- Joining clips into one video.
--
-- Every model this platform can reach caps a single render at eight to fifteen
-- seconds, so a finished piece of content is several of them in a row. This is
-- the record of that request: which clips, in what order, and what came out.
--
-- Deliberately not a column on `projects`. A project can be exported many
-- times, with different cuts, and keeping only the latest would throw away the
-- one thing the user actually authored, which is the order.
create table if not exists public.project_renders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The same vocabulary as a generation. An export is a render too, and the UI
  -- shows both the same way, so a second status enum would be two lists to keep
  -- in step for no gain.
  status public.generation_status not null default 'queued',
  -- Object paths in the `renders` bucket, in cut order. Paths rather than URLs
  -- for the usual reason: a signed URL is a fact that expires.
  clip_paths text[] not null,
  -- Mirrors MAX_CLIPS in the worker. An unbounded list is an unbounded amount
  -- of somebody else's CPU, since every clip is decoded and re-encoded.
  --
  -- Coalesced because `array_length` returns NULL for an empty array, and a
  -- check constraint only rejects FALSE: written as a bare `between`, an empty
  -- list evaluated to NULL and was accepted, which is a render job with nothing
  -- to render.
  constraint project_renders_clips_check
    check (coalesce(array_length(clip_paths, 1), 0) between 1 and 20),
  result_path text,
  duration_seconds integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The scheduler's scan: oldest queued first.
create index if not exists project_renders_queued_idx
  on public.project_renders (status, created_at)
  where status = 'queued';

create index if not exists project_renders_project_idx
  on public.project_renders (project_id, created_at desc);

create trigger project_renders_set_updated_at
  before update on public.project_renders
  for each row execute function public.set_updated_at();

alter table public.project_renders enable row level security;

create policy "Owners read their renders"
  on public.project_renders for select
  using (auth.uid() = user_id);

-- Insert only. The worker moves the row through its states with the service
-- role, and a client that could write `status` or `result_path` could claim a
-- render finished and point it at any object it liked.
create policy "Active owners request their renders"
  on public.project_renders for insert
  with check (auth.uid() = user_id and not is_suspended());

/*
 * Claims queued renders for one worker.
 *
 * `for update skip locked` is what makes this safe to run on several workers at
 * once: each takes a different set of rows rather than blocking on the same
 * ones. The status moves in the same statement that selects, so a row cannot be
 * claimed twice even if two scans overlap.
 */
create or replace function public.claim_queued_renders(p_limit integer default 5)
returns table (id uuid, user_id uuid, clip_paths text[])
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
  returning r.id, r.user_id, r.clip_paths;
$$;

-- No grant to `authenticated`: a client claiming renders would move rows into a
-- state nothing is processing.
--
-- The grant to `service_role` has to be explicit. Revoking from PUBLIC removes
-- the default that every role inherits, service_role included, and PostgREST
-- hides a function the caller cannot execute rather than reporting a permission
-- error, so the worker saw "Could not find the function ... in the schema
-- cache" and no amount of reloading the cache would have helped.
revoke all on function public.claim_queued_renders(integer) from public, anon, authenticated;
grant execute on function public.claim_queued_renders(integer) to service_role;
