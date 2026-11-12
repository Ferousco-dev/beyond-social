-- HeyGen avatars were removed from the product, so their price rows only confuse the admin page.
delete from public.action_prices where provider = 'heygen';
delete from public.credit_settings where key = 'alert_heygen_usd';
