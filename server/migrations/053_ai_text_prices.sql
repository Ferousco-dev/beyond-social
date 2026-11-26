-- Every AI action costs credits, including the small text ones that were free:
-- filling the video form (and rewriting its script for a new length), writing a
-- post caption, and writing a talking-avatar script. An admin can change these
-- on the Pricing page like any other action.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('autofill',      'gemini', 'message', 0.0030, 1),
  ('post_caption',  'gemini', 'message', 0.0010, 1),
  ('script_write',  'gemini', 'message', 0.0020, 1)
on conflict (action) do nothing;
