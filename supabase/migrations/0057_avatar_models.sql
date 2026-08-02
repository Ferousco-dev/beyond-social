-- The avatar models that actually exist at the provider.
--
-- Two rows in this catalogue named models the provider rejects outright with
-- "The model name you specified is not supported": `volcengine/lip-sync` and
-- `kling-3.0-turbo`. Both were inactive, so nothing had failed yet, but they
-- were a trap: activating either would have reserved a credit and then failed
-- at the door, every time. Verified against the provider's own createTask
-- endpoint, which validates the name before anything else.
delete from public.model_catalog
 where id in ('volcengine/lip-sync', 'kling-3.0-turbo');

/*
 * Kling's audio-driven avatars, alongside InfiniteTalk.
 *
 * All three take the same three inputs (image_url, audio_url, prompt) and are
 * dispatched through the same market endpoint, so they cost nothing to support
 * beyond a row each. Verified: the provider accepts every id below and asks for
 * exactly those three fields.
 *
 * Pricing is the awkward part. The provider bills these per second of output,
 * and for an audio-driven avatar the output length is the length of the voice
 * clip, which we do not know until the user records one. `credit_cost` is a
 * flat number per run, so each is priced at the fifteen-second cap: the most a
 * single generation can cost. That over-charges a short clip, which is the
 * direction to be wrong in, since the alternative is discovering the shortfall
 * on the invoice. Charging by measured duration is the real fix and needs a
 * per-second rate on this table.
 *
 * Provider rates, for the arithmetic above: InfiniteTalk 3 credits/s at 480p
 * and 12 at 720p; Kling Standard 8 credits/s at 720p; Kling Pro 16 credits/s
 * at 1080p. A provider credit is $0.005 and ours is $0.05 of provider cost.
 */
insert into public.model_catalog
  (id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order)
values
  ('kling/ai-avatar-standard', 'kie', 'Kling Avatar', 'avatar',
   'Turns a photo and a voice clip into that person speaking, at 720p.',
   array['image-to-video', 'lip-sync', 'audio-driven', '720p', 'vertical'], 12, 'free', true, 11),

  ('kling/ai-avatar-pro', 'kie', 'Kling Avatar Pro', 'avatar',
   'The sharpest avatar model, at 1080p. Four times the cost of the standard tier.',
   array['image-to-video', 'lip-sync', 'audio-driven', '1080p', 'vertical'], 24, 'studio', true, 12)
on conflict (id) do nothing;

-- InfiniteTalk was priced at 3, which covers roughly ten seconds at 480p and
-- under-charges the fifteen-second maximum. Raised to cover the cap, on the
-- same reasoning as above.
update public.model_catalog
   set credit_cost = 5
 where id = 'infinitalk/from-audio';
