-- Admin-tunable numbers for the credit system, and a marker so the sign-up
-- grant is applied exactly once per account.
create table public.credit_settings (
  key         text primary key,
  value       integer not null check (value >= 0),
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

insert into public.credit_settings (key, value) values
  ('signup_grant', 25),
  -- Most credits one user can spend in 24 hours. 0 turns the brake off.
  ('daily_user_limit', 1000),
  -- Raise an admin alert when a provider balance falls below these.
  ('alert_kie_credits', 500),
  ('alert_heygen_usd', 5),
  ('alert_apify_usd', 1);

alter table public.credit_settings enable row level security;

alter table public.profiles add column signup_granted_at timestamptz;
