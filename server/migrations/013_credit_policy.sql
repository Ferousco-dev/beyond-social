-- Everything is paid for with credits, and a new account starts with 300.
update public.credit_settings set value = 300 where key = 'signup_grant' and value = 25;

-- HeyGen does not bill per avatar created (only video output, per second), so
-- this is a guard against abuse and a contribution to storage and review, not a
-- pass-through of cost. The admin can change it.
update public.action_prices set credits = 50, cost_usd = 0 where action = 'avatar_training' and credits = 200;

-- What each provider account held at a point in time. The drop between two
-- readings is what was really spent, which is the honest cost of the product.
create table public.provider_balance_snapshots (
  id          bigint generated always as identity primary key,
  provider    text not null,
  amount      numeric(14, 4) not null,
  unit        text not null check (unit in ('credits', 'usd')),
  taken_at    timestamptz not null default now()
);
create index provider_balance_snapshots_idx on public.provider_balance_snapshots (provider, taken_at desc);
alter table public.provider_balance_snapshots enable row level security;
