-- Whether a scraped post's thumbnail shows a person, cached per post.
--
-- The Discover "human-led" filter needs to know this for every post on
-- screen, and finding out costs a vision call per thumbnail. Keyed by
-- (platform, video_id) rather than folded into scrape_cache's per-search
-- blob, because the same post resurfaces under many different search terms
-- and a filter that re-classified it every time it did would be paying
-- Gemini again for a question it already answered.
--
-- Same shape as scrape_cache: public post data, shared across users, written
-- by the server action under the service role so a client cannot poison what
-- everyone else's filter reads.
create table if not exists public.post_classifications (
  platform text not null,
  video_id text not null,
  shows_person boolean,
  classified_at timestamptz not null default now(),
  primary key (platform, video_id)
);

comment on table public.post_classifications is
  'Whether a scraped post''s thumbnail shows a person, cached per post across all search terms.';

alter table public.post_classifications enable row level security;

create policy "post classifications are readable when signed in"
  on public.post_classifications for select
  to authenticated
  using (true);

-- Same freshness reasoning as scrape_cache: a stale scrape drops out of the
-- table it lives in on its own schedule, and a classification for a post
-- that no longer appears anywhere is just as harmless to keep as it is
-- pointless to prune on its own timer, so this rides the same sweep instead
-- of getting a second one.
create or replace function public.prune_post_classifications(p_max_age interval default interval '30 days')
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.post_classifications where classified_at < now() - p_max_age;
$$;

revoke all on function public.prune_post_classifications(interval) from public;
