-- Semantic conversation memory: finding past work by meaning.
--
-- The three memory layers that exist answer different questions. The thread
-- answers "what did we just say". Long-term memory answers "what is true about
-- this person". Neither answers "continue the project we discussed last month",
-- which needs a search across conversations the current thread knows nothing
-- about.
--
-- Kept in its own table rather than as a column on `messages`, for two reasons.
-- Embedding is asynchronous and lossy: it happens after the turn is saved, it
-- can fail, and a null column on the source of truth would make "not embedded
-- yet" and "failed" indistinguishable from "no message". And only user messages
-- are embedded, so a column would be null on half of every thread by design.

create table if not exists public.message_embeddings (
  message_id uuid primary key references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,

  -- Denormalised so a search result can be rendered without a second read. It
  -- is a snippet, not the message: the full text lives in `messages`.
  snippet text not null,

  embedding vector(1024) not null,
  created_at timestamptz not null default now()
);

create index if not exists message_embeddings_user_idx
  on public.message_embeddings (user_id, created_at desc);

create index if not exists message_embeddings_vector_idx
  on public.message_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.message_embeddings enable row level security;

create policy message_embeddings_owner on public.message_embeddings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/*
 * Past conversations most similar to a query, as threads rather than fragments.
 *
 * Grouped by project on purpose. Ungrouped, a long conversation about one
 * subject floods the results with ten near-identical rows and buries the other
 * four projects that were also relevant. One row per project, scored by its best
 * matching message, is what makes the result set read like "here is the work you
 * did on this".
 *
 * `p_exclude` keeps the current thread out. It is the most similar conversation
 * to itself by definition, and returning it as "related earlier work" would be
 * both useless and confusing.
 */
create or replace function public.match_conversations(
  p_embedding vector(1024),
  p_limit integer default 3,
  p_exclude uuid default null,
  p_min_similarity real default 0.5
)
returns table (
  project_id uuid,
  title text,
  snippet text,
  last_active timestamptz,
  similarity real
)
language sql
stable
security invoker
set search_path = public
as $$
  -- Two steps, because `distinct on` forces the project to lead the ordering,
  -- which is not the order the caller wants. The inner query picks the best
  -- message per project; the outer one ranks those projects against each other.
  select best.project_id, best.title, best.snippet, best.last_active, best.similarity
  from (
    select distinct on (e.project_id)
      e.project_id,
      p.title,
      e.snippet,
      e.created_at as last_active,
      (1 - (e.embedding <=> p_embedding))::real as similarity
    from public.message_embeddings e
    join public.projects p on p.id = e.project_id
    where (p_exclude is null or e.project_id <> p_exclude)
      and (1 - (e.embedding <=> p_embedding)) >= p_min_similarity
    order by e.project_id, e.embedding <=> p_embedding
  ) as best
  order by best.similarity desc
  limit least(greatest(p_limit, 1), 10);
$$;
