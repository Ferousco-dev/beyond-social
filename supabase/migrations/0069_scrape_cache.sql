-- Searches already paid for.
--
-- Every Discover search is an Apify actor run: seconds of waiting for the user
-- and a charge against the account. Two people searching "fashion" on the same
-- afternoon paid for it twice, and so did one person going back to a search
-- they ran a minute ago. The results are public posts, identical for whoever
-- asked, so there is nothing per-user to keep them apart.
--
-- Deliberately not per-user. A cache keyed by user would miss on almost every
-- read, which is the same as no cache while still costing a table.

create table if not exists public.scrape_cache (
  platform text not null,
  -- Folded and trimmed by the caller, so "Fashion" and "fashion " are one row
  -- rather than three identical scrapes.
  query text not null,
  posts jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (platform, query)
);

comment on table public.scrape_cache is
  'Apify search results, shared across users. Public post data only.';

-- The freshness sweep reads by age, and the table is small enough that this is
-- the only index worth carrying.
create index if not exists scrape_cache_fetched_at_idx
  on public.scrape_cache (fetched_at desc);

alter table public.scrape_cache enable row level security;

-- Readable by any signed-in user, writable by none of them. Rows are written by
-- the server action under the service role, so a client cannot poison the cache
-- that every other user reads from.
create policy "scrape cache is readable when signed in"
  on public.scrape_cache for select
  to authenticated
  using (true);

/*
 * Drops what is too old to serve.
 *
 * Trending content stops being trending, so a stale row is worse than a miss:
 * the whole point of the page is what is working now. Called from the read path
 * rather than scheduled, which keeps the table honest without a cron entry for
 * something this small.
 */
create or replace function public.prune_scrape_cache(p_max_age interval default interval '6 hours')
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.scrape_cache where fetched_at < now() - p_max_age;
$$;

revoke all on function public.prune_scrape_cache(interval) from public;
