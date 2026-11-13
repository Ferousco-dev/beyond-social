-- What every AI call cost the provider, in tokens, so real spend can be compared
-- with the credits charged. One row per successful provider call. Counts only: no
-- prompt or response text is stored. user_id is kept null when the account is
-- deleted, so spend history survives without identifying anyone.
create table public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  provider      text not null check (char_length(provider) between 1 and 40),
  model         text not null check (char_length(model) between 1 and 100),
  purpose       text not null default '' check (char_length(purpose) <= 60),
  user_id       uuid references public.profiles (id) on delete set null,
  job_id        text,
  input_tokens  integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens  integer not null default 0 check (total_tokens >= 0)
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc) where user_id is not null;
create index ai_usage_created_idx on public.ai_usage (created_at desc);
create index ai_usage_job_idx on public.ai_usage (job_id) where job_id is not null;

-- Written and read by the API with the service role only.
alter table public.ai_usage enable row level security;
