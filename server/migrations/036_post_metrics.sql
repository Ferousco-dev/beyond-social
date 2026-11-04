-- Per-video engagement snapshots. One row per collection; the latest row per
-- post is its current standing, history powers trends and posting-time advice.
create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.scheduled_posts (id) on delete cascade,
  user_id uuid not null,
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  comments bigint not null default 0 check (comments >= 0),
  shares bigint not null default 0 check (shares >= 0),
  collected_at timestamptz not null default now()
);

create index post_metrics_post_collected_idx on public.post_metrics (post_id, collected_at desc);
create index post_metrics_user_idx on public.post_metrics (user_id, collected_at desc);

alter table public.post_metrics enable row level security;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute
      'alter table public.post_metrics add constraint post_metrics_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade';
    execute
      'create policy post_metrics_select_own on public.post_metrics for select to authenticated using (user_id = (select auth.uid()))';
  end if;
end
$$;
