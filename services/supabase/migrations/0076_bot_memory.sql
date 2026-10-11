-- Cross-task memory for the Telegram engineering bot.
--
-- Each task the bot dispatches runs in a brand new Claude Code session with
-- no awareness of any earlier one (see services/telegram-agent/README.md,
-- "How state works"). Today the only thing that carries context forward is
-- docs/telegram-agent/JOURNAL.md, a markdown file a session reads before
-- acting and appends to as part of its own commit. This table is the same
-- idea in a form other than a file: a queryable, append-only record a task
-- could read at the start of a run and write to as part of finishing one,
-- without depending on a session correctly parsing prose out of a doc that
-- also carries human-facing explanation around each entry.
--
-- Nothing in the bot or the workflow writes here yet; this migration only
-- brings the table into existence. Wiring a task up to read and append to it
-- (instead of, or alongside, JOURNAL.md) is separate follow-up work.

create table if not exists public.bot_memory (
  id         uuid primary key default gen_random_uuid(),

  -- The task that authored this entry, e.g. "task_20260828_ab12cd" (see
  -- services/telegram-agent/lib/tasks.py:generate_task_id). Null for entries
  -- written outside the Telegram flow.
  task_id    text check (task_id ~ '^task_[0-9]{8}_[0-9a-f]{6}$'),

  -- What was asked and what changed or was decided, in the same voice as a
  -- JOURNAL.md entry: short, plain, useful to a session that has never seen
  -- this conversation.
  summary    text not null check (char_length(summary) > 0),

  created_at timestamptz not null default now()
);

alter table public.bot_memory enable row level security;

-- No policies, deliberately: written and read by the bot's own backend
-- (the Vercel function, or a GitHub Actions workflow step) using the
-- service role, never by a browser session. RLS with no policy denies every
-- ordinary role; the service role bypasses it.

-- History, not a queue: a task's own write is the only thing that should
-- ever add a row, and nothing should ever change what an earlier task
-- recorded.
create or replace function public.bot_memory_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'bot_memory is append-only';
end; $$;

drop trigger if exists bot_memory_no_rewrite on public.bot_memory;
create trigger bot_memory_no_rewrite
  before update or delete on public.bot_memory
  for each row execute function public.bot_memory_immutable();

create index if not exists bot_memory_created_idx
  on public.bot_memory (created_at desc);

revoke update, delete on public.bot_memory from authenticated, anon;

comment on table public.bot_memory is
  'Cross-task memory for the Telegram engineering bot: one row per JOURNAL.md-style entry. Not yet wired to any writer; see services/telegram-agent/README.md.';
