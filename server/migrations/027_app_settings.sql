-- Text settings an admin changes from the console, such as which model answers
-- each kind of request. Credit amounts keep their own table.
create table public.app_settings (
  key         text primary key check (char_length(key) between 1 and 64),
  value       text not null check (char_length(value) <= 200),
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;
