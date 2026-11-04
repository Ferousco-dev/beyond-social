-- What the assistant remembers. Facts are short statements a person chose to
-- keep (their brand, audience, style). A conversation summary stands in for the
-- turns older than the ones the assistant reads word for word.
create table public.user_memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 200),
  created_at timestamptz not null default now()
);
create index user_memories_user_idx on public.user_memories (user_id, created_at);

alter table public.profiles add column memory_enabled boolean not null default true;

create table public.conversation_summaries (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  content         text not null check (char_length(content) <= 1500),
  -- The newest message folded into the summary, so the next pass starts after it.
  through_message uuid not null,
  updated_at      timestamptz not null default now()
);

alter table public.user_memories enable row level security;
alter table public.conversation_summaries enable row level security;
