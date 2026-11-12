-- Speech and ambience cost KIE about 43% more per second (measured on four Kling 3.0 videos:
-- 14 credits a second without sound, 20 with), so a clip with sound is its own priced action.
-- Placeholders: pro mode has not been measured. 0.14 is the standard-mode sound cost of 0.10
-- raised by the 1.4 factor used for pro. Confirm both figures against a real KIE invoice.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('video_generate_sound_second', 'kie', 'second', 0.14, 8)
on conflict (action) do nothing;
