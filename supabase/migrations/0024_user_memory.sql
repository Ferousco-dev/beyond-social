-- Long-term memory: durable facts about a person, carried across conversations.
--
-- This is not the knowledge base. `prompt_chunks` holds craft knowledge that is
-- the same for everyone; this holds what is true about one person, and the two
-- must never share a table because they have opposite access rules. Craft
-- knowledge is readable by all; a memory is readable by exactly one user.
--
-- Also not conversation history. `messages` is the transcript, complete and
-- ordered. A memory is a distilled claim extracted from it, and most turns
-- produce none.

create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- The claim itself, in the third person, e.g. "Prefers vertical 9:16 video".
  fact text not null check (length(fact) between 3 and 500),

  -- What sort of claim it is, so retrieval can weight them differently and a
  -- person can be shown why something was remembered.
  kind text not null default 'fact'
    check (kind in ('preference', 'fact', 'style', 'goal')),

  -- How much this should influence future prompts, 0 to 1. Set by the extractor
  -- rather than by a rule, because "I always shoot vertical" and "I liked that
  -- one" are not equally durable.
  importance real not null default 0.5 check (importance between 0 and 1),

  embedding vector(1024),

  -- Where it came from, so a memory can be traced back to the conversation that
  -- produced it. Null once that project is deleted; the memory outlives it.
  source_project uuid references public.projects (id) on delete set null,

  -- Cheap dedupe. The extractor will re-derive the same fact from a later turn,
  -- and without this the same claim accumulates and drowns out everything else.
  fact_hash text not null,

  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  use_count integer not null default 0,

  unique (user_id, fact_hash)
);

-- Retrieval is always "this user's memories, nearest to this query", never a
-- global scan, so the user column leads.
create index if not exists user_memories_user_idx
  on public.user_memories (user_id, importance desc);

-- Same access pattern as prompt_chunks: approximate nearest neighbour over a
-- small, per-user slice.
create index if not exists user_memories_embedding_idx
  on public.user_memories using hnsw (embedding vector_cosine_ops);

alter table public.user_memories enable row level security;

-- A memory is the most personal row in the schema. One policy, one owner, no
-- shared read: nothing about "users can read memories in their organization",
-- because an organization is a workspace and not a person.
create policy user_memories_owner on public.user_memories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rolling summary of one conversation, so a long thread does not have to be
-- sent in full on every turn.
create table if not exists public.conversation_summaries (
  project_id uuid primary key references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  summary text not null,
  -- How much of the thread the summary already covers, so the next pass only
  -- reads what it has not seen.
  covered_through timestamptz not null,
  message_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.conversation_summaries enable row level security;

create policy conversation_summaries_owner on public.conversation_summaries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/*
 * Nearest memories for the calling user.
 *
 * Security invoker rather than definer: RLS already scopes this to one person,
 * and a definer function would have to re-implement that check correctly to
 * avoid handing one user another's memories. Letting the policy do it means
 * there is one place to get right instead of two.
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
    and (1 - (m.embedding <=> p_embedding)) >= p_min_similarity
  -- Similarity decides relevance; importance breaks ties, so a strongly held
  -- preference outranks a passing remark that happens to match the wording.
  order by m.embedding <=> p_embedding, m.importance desc
  limit least(greatest(p_limit, 1), 20);
$$;

/** Records that a memory was actually used, which is what makes pruning possible. */
create or replace function public.touch_user_memories(p_ids uuid[])
returns void
language sql
volatile
security invoker
set search_path = public
as $$
  update public.user_memories
  set last_used_at = now(), use_count = use_count + 1
  where id = any(p_ids);
$$;
