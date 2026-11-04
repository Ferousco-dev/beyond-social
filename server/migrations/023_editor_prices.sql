-- Editor actions that cost the user credits. Admin-editable like every price.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('editor_assist',   'gemini', 'message', 0.0020, 1),
  ('editor_captions', 'gemini', 'video',   0.0200, 10)
on conflict (action) do nothing;
