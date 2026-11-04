create table public.subscription_events (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  event_type     text not null check (event_type in ('started', 'status_changed', 'renewed', 'invoice_paid', 'invoice_payment_failed')),
  status         text not null,
  period_end     timestamptz,
  amount_cents   integer not null default 0 check (amount_cents >= 0),
  currency       text not null default '',
  invoice_id     text,
  attempt_count  integer not null default 0 check (attempt_count >= 0),
  occurred_at    timestamptz not null default now()
);

create index subscription_events_user_time_idx on public.subscription_events (user_id, occurred_at desc);
create unique index subscription_events_invoice_attempt_idx
  on public.subscription_events (event_type, invoice_id, attempt_count)
  where invoice_id is not null;

alter table public.subscription_events enable row level security;