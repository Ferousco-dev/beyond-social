-- Provider credentials pasted in by an admin, encrypted by the API before they
-- reach the database. The table is unreadable to client roles.
create table public.provider_credentials (
  name        text primary key,
  ciphertext  bytea not null,
  last4       text not null default '',
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.provider_credentials enable row level security;

-- Who changed what, without ever recording a value.
create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target      text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
