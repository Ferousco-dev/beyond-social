-- Talking photos now run on KIE's Kling avatar Pro model (1080p), which KIE
-- charges at about $0.101 a second, double the Standard tier. Raise the stored
-- price to match, but only if it is still the original placeholder so a price
-- the admin has already set is left alone.
update public.action_prices
   set cost_usd = 0.11, credits = 7
 where action = 'talking_photo_second'
   and provider = 'kie'
   and cost_usd = 0.06
   and credits = 4;
