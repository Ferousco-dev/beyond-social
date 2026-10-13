-- Problems only an operator can fix (a provider out of credit, a revoked key).
-- Repeats of one problem update a single open row instead of adding a row each.
create table public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quota', 'auth')),
  provider text not null,
  message text not null,
  last_user_id uuid,
  last_resource text,
  count integer not null default 1 check (count >= 1),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  notified_at timestamptz,
  resolved_at timestamptz
);

create unique index admin_alerts_open_idx on public.admin_alerts (kind, provider) where resolved_at is null;
create index admin_alerts_recent_idx on public.admin_alerts (last_seen desc);

-- Reachable only through the Go API's admin endpoints, never from the browser.
alter table public.admin_alerts enable row level security;
