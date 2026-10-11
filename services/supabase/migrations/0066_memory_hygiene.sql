-- Forgetting.
--
-- The store could only ever grow. Dedupe was an exact hash of the text, so
-- "I shoot vertical" and "I've switched to landscape" were two different rows,
-- both retrievable, both true-looking, contradicting each other in the same
-- prompt. Nothing decayed and nothing was ever removed, so the longer somebody
-- used the product the noisier their memory became, and retrieval started
-- returning five rows that were merely similar rather than five that were right.
--
-- Three mechanisms, in the order they matter:
--
--   supersession  a new claim about the same thing retires the old one
--   decay         a memory nobody has used in months stops competing
--   eviction      what has been retired or has decayed away is deleted
--
-- Supersession keeps the old row rather than overwriting it. When a preference
-- changes, the previous value and the moment it changed are the only record of
-- why the product started behaving differently, and overwriting destroys the
-- one thing that would explain it.

alter table public.user_memories
  -- Set when a later claim replaced this one. Excluded from retrieval from that
  -- moment, kept for as long as eviction allows.
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references public.user_memories (id) on delete set null;

-- Retrieval reads live memories only, so the partial index matches the query.
create index if not exists user_memories_live_idx
  on public.user_memories (user_id, importance desc)
  where superseded_at is null;

comment on column public.user_memories.superseded_at is
  'When a later memory replaced this claim. Non-null rows are never retrieved.';

/*
 * Retrieval, now excluding what has been retired.
 *
 * Ranking is deliberately unchanged: similarity decides, importance breaks ties.
 * Decay is not folded in here. A memory that matches the query strongly is the
 * right answer whether it was last used yesterday or in March, and letting age
 * outrank meaning would make recall feel arbitrary in exactly the cases it is
 * most useful. Age is what decides whether a memory is kept at all, which is a
 * different question and is answered by `prune_user_memories`.
 */
create or replace function public.match_user_memories(
  p_embedding vector(1024),
  p_limit integer default 5,
  p_min_similarity real default 0.3
)
returns table (id uuid, fact text, kind text, importance real, similarity real)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id,
    m.fact,
    m.kind,
    m.importance,
    (1 - (m.embedding <=> p_embedding))::real as similarity
  from public.user_memories m
  where m.embedding is not null
    and m.superseded_at is null
    and (1 - (m.embedding <=> p_embedding)) >= p_min_similarity
  order by m.embedding <=> p_embedding, m.importance desc
  limit least(greatest(p_limit, 1), 20);
$$;

/*
 * The nearest live memory to a new claim, so the writer can tell the difference
 * between something new and a new version of something old.
 *
 * Separate from `match_user_memories` because the question is different: recall
 * wants the five most relevant, this wants the single closest and needs its id
 * to retire it. Returning the fact as well lets the caller log what was replaced
 * rather than silently swapping one row for another.
 */
create or replace function public.nearest_user_memory(
  p_embedding vector(1024),
  p_min_similarity real default 0.9
)
returns table (id uuid, fact text, similarity real)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id,
    m.fact,
    (1 - (m.embedding <=> p_embedding))::real as similarity
  from public.user_memories m
  where m.embedding is not null
    and m.superseded_at is null
    and (1 - (m.embedding <=> p_embedding)) >= p_min_similarity
  order by m.embedding <=> p_embedding
  limit 1;
$$;

/*
 * Deletes what is no longer worth keeping.
 *
 * Two populations, and they are not the same:
 *
 *   retired    superseded long enough ago that the change is no longer news
 *   faded      never recalled since it was written, and written long ago
 *
 * The second condition is the careful one. `last_used_at is null` alone would
 * delete a memory recorded yesterday that simply has not come up yet, so the
 * age of the row is checked too. A memory that has been used even once is never
 * evicted by age: it proved itself, and a preference someone stated in January
 * is not less true in August.
 */
-- Named and shaped like its siblings in 0030 so the retention endpoint can run
-- it through the same helper, and dry run by default for the same reason they
-- are: the first accidental call should be harmless, and deleting somebody's
-- memories has to be the thing that was asked for.
create or replace function public.retention_prune_memories(
  p_dry_run boolean default true,
  p_retired_days integer default 90,
  p_unused_days integer default 180
)
returns table (affected integer, oldest timestamptz, dry_run boolean)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  doomed uuid[];
  removed integer := 0;
  first_created timestamptz;
begin
  select array_agg(m.id), min(m.created_at)
    into doomed, first_created
  from public.user_memories m
  where
    (m.superseded_at is not null and m.superseded_at < now() - make_interval(days => p_retired_days))
    or (
      m.last_used_at is null
      and m.use_count = 0
      and m.created_at < now() - make_interval(days => p_unused_days)
    );

  if doomed is null then
    return query select 0, null::timestamptz, p_dry_run;
    return;
  end if;

  if p_dry_run then
    return query select array_length(doomed, 1), first_created, true;
    return;
  end if;

  with gone as (
    delete from public.user_memories where id = any(doomed) returning 1
  )
  select count(*)::integer into removed from gone;

  return query select removed, first_created, false;
end;
$$;

grant execute on function public.nearest_user_memory(vector, real) to authenticated;
grant execute on function public.retention_prune_memories(boolean, integer, integer) to authenticated;
