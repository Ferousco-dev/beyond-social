-- Prices for the picture, voice and talking photo tools. Every figure is a
-- placeholder until a real KIE run reports what each model costs; the admin
-- can change them at any time.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('image_edit', 'kie', 'picture', 0.03, 2),
  ('talking_photo_second', 'kie', 'second', 0.06, 4),
  ('speech_thousand_chars', 'kie', '1000 characters', 0.03, 2);
