-- Recency as a tiebreak, not as a ranking.
--
-- Retrieval ordered by similarity, then importance. That is right, and it stays
-- right: a memory that matches the query strongly is the correct answer whether
-- it was last used yesterday or in March, and letting age outrank meaning would
-- make recall feel arbitrary in exactly the cases it is most useful.
--
-- What it could not do is separate two memories that match equally well. "Films
-- in the kitchen at closing time", recalled weekly, and a near-identical claim
-- nobody has touched since it was written, arrive with the same similarity and
-- the same importance, and the order between them was whatever the index
-- happened to return.
--
-- So recency only breaks ties. Similarity is rounded to three decimals for the
-- comparison, which is well inside the noise of an approximate nearest-neighbour
-- search: two rows that agree to three decimals are the same match by any
-- honest reading, and below that the ordering was already arbitrary.

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
  order by
    round((1 - (m.embedding <=> p_embedding))::numeric, 3) desc,
    m.importance desc,
    -- Nulls last, so a memory that has proved useful outranks one that never
    -- has. `use_count` before the timestamp: having been wanted at all matters
    -- more than how recently.
    m.use_count desc,
    m.last_used_at desc nulls last,
    m.created_at desc
  limit least(greatest(p_limit, 1), 20);
$$;
