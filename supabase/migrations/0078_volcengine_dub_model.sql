-- A real, verified model id, added inactive.
--
-- `volcengine/video-to-video-lip-sync` was checked directly against the
-- provider's own docs (docs.kie.ai/market/volcengine/video-to-video-lip-sync.md)
-- this session: it re-dubs an existing video's mouth to a new audio track
-- (mode: lite|basic, video_url, audio_url), 360p-1080p in, MP4 25fps out,
-- output length following the audio rather than the source video. This is a
-- different id from `volcengine/lip-sync`, which migration 0057 already
-- deleted because the provider rejects that exact name outright; do not
-- confuse the two.
--
-- Left inactive for two independent reasons, same as the Wan models in
-- migration 0058: the provider's docs state no pricing at all for this
-- model, so credit_cost below is a flat, guessed placeholder rather than a
-- real rate, and the composer has nothing that uploads a video into a
-- generation, so nothing could feed this model's required video_url even if
-- it were priced. Both need solving before this goes live: a real rate read
-- off the provider's pricing page, and video-input support in the composer.
insert into public.model_catalog
  (id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order)
values
  ('volcengine/video-to-video-lip-sync', 'kie', 'Volcengine Video Dub', 'avatar',
   'Re-dubs an existing video''s mouth to a new audio track.',
   array['video-to-video', 'lip-sync', 'audio-driven', '1080p'], 30, 'studio', false, 24)
on conflict (id) do nothing;
