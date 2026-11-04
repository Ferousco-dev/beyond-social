-- Credit packs an admin sells, and the payments that bought them. A payment keeps
-- its own copy of the pack's name, credits and price, so editing a pack later
-- never changes what an earlier purchase was for.
create table public.credit_packs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 60),
  credits      integer not null check (credits > 0),
  price_cents  integer not null check (price_cents >= 50),
  currency     text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  enabled      boolean not null default true,
  sort         integer not null default 0,
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

-- Placeholder packs from the credit design, at $0.05 a credit before bulk bonuses.
-- The admin edits or replaces them before selling anything.
insert into public.credit_packs (name, credits, price_cents, sort) values
  ('Starter', 200, 1000, 1),
  ('Creator', 550, 2500, 2),
  ('Studio', 1800, 7500, 3);

create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  pack_id            uuid references public.credit_packs (id) on delete set null,
  pack_name          text not null,
  credits            integer not null check (credits > 0),
  amount_cents       integer not null check (amount_cents > 0),
  currency           text not null,
  status             text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  credits_removed    integer not null default 0 check (credits_removed >= 0),
  stripe_session_id  text unique,
  payment_intent     text,
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_intent_idx on public.payments (payment_intent) where payment_intent is not null;

alter table public.credit_packs enable row level security;
alter table public.payments enable row level security;
