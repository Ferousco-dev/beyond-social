-- Discovered trends.
--
-- The feed was a hardcoded array with invented view counts. This replaces it
-- with rows produced by a scheduled discovery run: Firecrawl fetches the source
-- pages, an extraction pass turns them into structured trends, and the result
-- lands here.
--
-- Trends are shared, not per-user: what is trending on TikTok this week is the
-- same fact for everyone, so there is no user_id and every signed-in user reads
-- the same rows. That also means one discovery run serves the whole platform
-- rather than one run per user.

create table if not exists public.trends (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  -- Free text rather than an enum: the taxonomy comes from what is actually
  -- found, and a new niche must not require a migration.
  category     text not null,
  -- Which platform this was observed on, when the source makes that clear.
  platform     public.social_platform,
  -- Where it came from, so a user can judge the claim for themselves. This is
  -- what separates a discovered trend from an asserted one.
  source_url   text not null,
  source_name  text not null default '',
  -- A ready-to-use brief, which is the point of the feed: a trend the user
  -- cannot act on is trivia.
  prompt       text not null,
  -- 0..1 confidence from the extraction pass. Deliberately not a view count:
  -- we do not have real view data and will not invent it.
  confidence   numeric(4, 3) not null default 0.5
    check (confidence >= 0 and confidence <= 1),
  discovered_at timestamptz not null default now(),
  -- Trends go stale fast. A row past its expiry is hidden rather than deleted,
  -- so a failed discovery run leaves the feed empty and honest instead of
  -- showing last month's trends as current.
  expires_at   timestamptz not null default now() + interval '14 days'
);

-- The feed reads fresh rows newest first, optionally filtered by category.
create index if not exists trends_fresh_idx
  on public.trends (expires_at desc, discovered_at desc);
create index if not exists trends_category_idx on public.trends (category, discovered_at desc);

-- Re-running discovery must refresh a trend rather than duplicate it.
create unique index if not exists trends_title_source_idx
  on public.trends (lower(title), source_url);

alter table public.trends enable row level security;

-- Readable by any signed-in user; written only by the service role running
-- discovery. anon is excluded so the feed is a reason to sign in.
create policy "trends_select_authenticated" on public.trends
  for select to authenticated using (true);

-- Records each discovery run so a silently failing scraper is visible rather
-- than looking like "no trends this week".
create table if not exists public.trend_runs (
  id          bigserial primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  sources     int not null default 0,
  discovered  int not null default 0,
  ok          boolean not null default false,
  error       text
);

alter table public.trend_runs enable row level security;
-- No policy: run history is operational data, read with the service role.

-- Fresh trends for the feed. Security invoker, so the select policy above is
-- what authorises it; there is nothing here to escalate for.
create or replace function public.trends_current(p_category text default null, p_limit int default 24)
returns setof public.trends
language sql
stable
set search_path = public
as $$
  select *
    from public.trends
   where expires_at > now()
     and (p_category is null or category = p_category)
   order by confidence desc, discovered_at desc
   limit greatest(p_limit, 1);
$$;

grant execute on function public.trends_current(text, int) to authenticated;
