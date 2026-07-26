-- The unique index in 0016 was on `lower(title)`, which upsert cannot target:
-- PostgREST's on_conflict needs a plain column list matching a real constraint,
-- and an expression index does not qualify. Without this, a repeat discovery
-- run duplicates every trend instead of refreshing it.
--
-- Case-insensitive titles are the lesser concern; being able to re-run
-- discovery idempotently is the point.
drop index if exists public.trends_title_source_idx;

create unique index if not exists trends_title_source_idx
  on public.trends (title, source_url);
