-- Editing a person's own video (outfit, background) with Kling 3.0 Omni's
-- transformation on KIE, priced per second of their video. KIE lists $0.0755 a
-- second at 720p without sound; its docs do not say whether the input seconds
-- are billed as well, so the credits leave room for that. Placeholder until the
-- figure is checked against a real KIE invoice.
insert into public.action_prices (action, provider, unit, cost_usd, credits) values
  ('video_edit_second', 'kie', 'second', 0.0755, 6)
on conflict (action) do nothing;
