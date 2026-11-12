-- Clips now render in Kling's higher quality tier, which costs KIE more per second
-- (about 1.4 times the standard tier). Raise the placeholder price to match. It only
-- changes the row while it still holds the original placeholder, so a price an admin
-- has already set is left alone. Confirm the figure against a real KIE invoice.
update public.action_prices
set cost_usd = 0.10, credits = 6, updated_at = now()
where action = 'video_generate_second' and cost_usd = 0.07 and credits = 4;
