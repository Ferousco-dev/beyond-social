-- Credits. The ledger is append-only and the source of truth; balances are the
-- running total, changed in the same transaction as the ledger row.
create table public.credit_balances (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  kind             text not null check (kind in ('grant', 'purchase', 'reserve', 'settle', 'refund', 'adjust', 'expire')),
  amount           integer not null,
  balance_after    integer not null check (balance_after >= 0),
  job_id           uuid,
  idempotency_key  text not null unique,
  reason           text not null default '',
  actor_id         uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);
create index credit_ledger_job_idx on public.credit_ledger (job_id) where job_id is not null;

-- One row per priced action. credits is what the user pays; cost_usd and margin
-- record how it was derived so a wrong price shows up as a number.
create table public.action_prices (
  action      text primary key,
  provider    text not null,
  unit        text not null,
  cost_usd    numeric(10, 4) not null default 0 check (cost_usd >= 0),
  margin      numeric(6, 3) not null default 1.5 check (margin >= 0),
  credits     integer not null check (credits >= 0),
  enabled     boolean not null default true,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('discovery_search',         'apify', 'search',        0.10,  5),
  ('video_transform:5:720p',   'kie',   'video',         0.35, 18),
  ('video_transform:5:1080p',  'kie',   'video',         0.53, 27),
  ('video_transform:10:720p',  'kie',   'video',         0.70, 35),
  ('video_transform:10:1080p', 'kie',   'video',         1.05, 53),
  ('avatar_video_second',      'heygen', 'second',       0.08,  4),
  ('avatar_training',          'heygen', 'avatar',       0,   200);

alter table public.credit_balances enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.action_prices enable row level security;
