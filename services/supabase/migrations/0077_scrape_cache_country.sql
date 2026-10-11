-- Discover search results now vary by country, not just query.
--
-- The TikTok actor's proxyCountryCode field routes a search through a proxy
-- in that country, which biases TikTok's own ranking toward what is trending
-- there. That means the same query genuinely returns a different result set
-- per country, so a cache keyed only on (platform, query) would serve one
-- country's results to every other one.

alter table public.scrape_cache add column if not exists country text not null default '';

alter table public.scrape_cache drop constraint if exists scrape_cache_pkey;
alter table public.scrape_cache add primary key (platform, query, country);

comment on column public.scrape_cache.country is
  'ISO 3166-1 alpha-2, or empty when no country was resolved for the search (local dev, a request outside Vercel''s edge).';
