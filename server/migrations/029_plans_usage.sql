-- Plans. A user with no subscription row is on the Free plan: they pay for
-- actions with credits. A Pro subscriber is metered by usage limits instead.
create table public.subscriptions (
  user_id              uuid primary key references public.profiles (id) on delete cascade,
  status               text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_customer      text,
  stripe_subscription  text unique,
  current_period_end   timestamptz,
  updated_at           timestamptz not null default now()
);

-- Where a Pro user stands in the two limits. The five hour window starts at their
-- first counted action and the weekly one at the Monday before it. Overage lets
-- them keep going on credits once a limit is full, up to a monthly cap they choose.
create table public.usage_state (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  five_start       timestamptz,
  five_points      integer not null default 0,
  week_start       timestamptz,
  week_points     integer not null default 0,
  overage_enabled  boolean not null default false,
  overage_cap      integer not null default 0 check (overage_cap >= 0)
);

-- What each charge took, so a refund or a smaller final cost can give it back.
create table public.usage_events (
  job_id      text primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  points      integer not null default 0 check (points >= 0),
  credits     integer not null default 0 check (credits >= 0),
  mult_pct    integer not null default 100 check (mult_pct > 0),
  five_start  timestamptz,
  week_start  timestamptz,
  overage     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index usage_events_user_idx on public.usage_events (user_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.usage_state enable row level security;
alter table public.usage_events enable row level security;

insert into public.credit_settings (key, value) values
  ('free_price_multiplier_pct', 200),
  ('pro_limit_five_hour', 40),
  ('pro_limit_week', 120),
  ('free_avatar_limit', 1),
  ('free_searches_per_day', 3),
  ('free_search_results', 10),
  ('pro_price_cents', 2000),
  ('overage_default_cap', 500)
on conflict (key) do nothing;

insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('chat_message', 'gemini', 'message', 0.0020, 1)
on conflict (action) do nothing;
