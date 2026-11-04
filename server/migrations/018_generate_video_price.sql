-- A generated clip is charged per second of finished video. The first figure is
-- a placeholder until a real KIE run confirms what Kling 3.0 costs; the admin
-- can change it at any time.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('video_generate_second', 'kie', 'second', 0.07, 4);
