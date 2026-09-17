-- Makes plan credits and displayed price admin-editable through the existing
-- app_config mechanism (admin_app_config_all / admin_set_app_config already
-- validate types and write the audit row; nothing new needed there).
--
-- Only these two fields move here. Name, description, features and the
-- Stripe price env var references stay in apps/web/src/lib/billing/plans.ts:
-- this table holds the entitlement (credits) and the *displayed* price, not
-- what Stripe actually charges.
--
-- price_usd is display-only. What a card is actually charged is controlled
-- entirely separately by STRIPE_PRICE_CREATOR/STRIPE_PRICE_STUDIO in Stripe's
-- own dashboard. Editing the value here does not touch Stripe: the admin UI
-- carries an explicit warning about this next to every price_usd row, and the
-- migration comment repeats it so it cannot be missed by reading the schema
-- either. credits has no such risk: it is a pure entitlement number.
insert into public.app_config (key, area, value, value_type, description) values
  ('billing.free.credits', 'billing', '90', 'number',
   'Monthly credits granted to the Free plan. Read by apps/web/src/lib/billing/plans.ts (falls back to the hardcoded default if unset).'),
  ('billing.free.price_usd', 'billing', '0', 'number',
   'Displayed USD price for the Free plan. Display only: Stripe is not involved for a free plan. Read by apps/web/src/lib/billing/plans.ts.'),
  ('billing.creator.credits', 'billing', '600', 'number',
   'Monthly credits granted to the Creator plan. Read by apps/web/src/lib/billing/plans.ts (falls back to the hardcoded default if unset).'),
  ('billing.creator.price_usd', 'billing', '79', 'number',
   'Displayed USD price for the Creator plan. Display only: what Stripe actually charges is STRIPE_PRICE_CREATOR, set separately. Read by apps/web/src/lib/billing/plans.ts.'),
  ('billing.studio.credits', 'billing', '1800', 'number',
   'Monthly credits granted to the Studio plan. Read by apps/web/src/lib/billing/plans.ts (falls back to the hardcoded default if unset).'),
  ('billing.studio.price_usd', 'billing', '229', 'number',
   'Displayed USD price for the Studio plan. Display only: what Stripe actually charges is STRIPE_PRICE_STUDIO, set separately. Read by apps/web/src/lib/billing/plans.ts.')
on conflict (key) do nothing;
