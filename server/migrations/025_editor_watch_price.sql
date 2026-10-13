insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('editor_watch', 'gemini', 'video', 0.0100, 5)
on conflict (action) do nothing;
