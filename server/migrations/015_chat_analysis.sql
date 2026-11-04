-- Watching a linked video is a flat-price action, editable by the admin like the rest.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('video_analysis', 'gemini', 'video', 0.01, 2);

-- An assistant message can point at the background job it started, so the chat
-- can show its progress and the finished description lands in the same thread.
alter table public.messages add column job_id uuid references public.jobs (id) on delete set null;

-- A follow-up posted when a job finishes exists once, however often it is attempted.
create unique index messages_assistant_key_idx on public.messages (conversation_id, idempotency_key)
  where idempotency_key is not null and role = 'assistant';
