-- A trending search returns up to 30 results, and Apify bills about $0.0037 per
-- TikTok result plus $0.001 a run, so one search costs about $0.12, not the
-- $0.10 placeholder. Record the real figure so the profit view is honest. Only
-- the original placeholder is changed, so a price an admin already set stays.
update public.action_prices
set cost_usd = 0.12, updated_at = now()
where action = 'discovery_search' and cost_usd = 0.10;
