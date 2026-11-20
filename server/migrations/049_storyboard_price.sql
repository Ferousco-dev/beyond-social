-- Writing a storyboard is one Gemini call that returns a few thousand tokens, so it is priced
-- a little above an editor message. Placeholder until the real cost is read from the usage log.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('storyboard', 'gemini', 'plan', 0.0100, 2)
on conflict (action) do nothing;
