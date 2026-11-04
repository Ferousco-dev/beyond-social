-- Each paid subscription invoice, for the admin's revenue view. Pack purchases
-- already live in payments; Stripe remains the book of record for both.
create table public.invoices (
  stripe_invoice  text primary key,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  amount_cents    integer not null check (amount_cents >= 0),
  currency        text not null,
  paid_at         timestamptz not null default now()
);
create index invoices_paid_idx on public.invoices (paid_at desc);
alter table public.invoices enable row level security;

-- The window a "limit reached" email was last sent for, so one window sends one email.
alter table public.usage_state add column limit_notified_for timestamptz;

insert into public.credit_settings (key, value) values ('stripe_tax_enabled', 0) on conflict (key) do nothing;
