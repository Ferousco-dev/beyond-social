-- What each finished job cost the provider, estimated from the price table at the
-- moment it completed. One row per job (the key makes a repeat harmless), for every
-- plan: Pro members spend no credits, so the credit ledger alone cannot show their
-- cost. Real provider spend is still read from balance snapshots; this attributes
-- it to jobs and people. user_id is kept null if the account is deleted.
create table public.provider_spend (
  job_id      text primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid references public.profiles (id) on delete set null,
  provider    text not null check (char_length(provider) between 1 and 40),
  job_type    text not null,
  action      text not null,
  units       integer not null check (units > 0),
  cost_usd    numeric(12, 4) not null check (cost_usd >= 0)
);
create index provider_spend_created_idx on public.provider_spend (created_at desc);
create index provider_spend_user_idx on public.provider_spend (user_id, created_at desc) where user_id is not null;

-- Written and read by the API with the service role only.
alter table public.provider_spend enable row level security;
