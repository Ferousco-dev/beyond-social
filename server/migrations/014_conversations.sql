-- Chat. A conversation is a thread of messages between one user and the
-- assistant. An assistant message may point at the workflow it proposed or started.
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null default '' check (char_length(title) <= 120),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index conversations_user_idx on public.conversations (user_id, updated_at desc) where archived_at is null;

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (char_length(content) between 1 and 8000),
  workflow_id      uuid references public.workflows (id) on delete set null,
  reply_to         uuid references public.messages (id) on delete set null,
  idempotency_key  text,
  created_at       timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_user_day_idx on public.messages (user_id, created_at) where role = 'user';
-- A retried send with the same key finds the original message instead of adding another.
create unique index messages_idempotency_idx on public.messages (conversation_id, idempotency_key)
  where idempotency_key is not null and role = 'user';

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

insert into public.credit_settings (key, value) values ('daily_chat_limit', 200);
