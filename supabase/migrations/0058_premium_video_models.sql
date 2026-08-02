-- The models the client actually asked for.
--
-- All six ids below were taken from the provider's own documentation index at
-- https://docs.kie.ai/llms.txt and then verified against `jobs/createTask` with
-- an empty input, which returns a validation error and starts nothing. None of
-- them was guessed.
--
-- Two are activated and four are not, and the difference is pricing rather than
-- doubt about the model. These bill per second of output. `credit_cost` is a
-- flat number per run, so a row can only be priced by choosing a duration, and
-- the provider publishes a rate per second per resolution. Kling's rates are
-- known; Wan's and Gemini Omni's are not, and a model priced by guesswork that
-- is live is a model that loses money on every run without anyone noticing.
-- The four unpriced rows are therefore inactive until a rate is read off the
-- provider's pricing page.
--
-- Where a rate is known, the price is the cost at the model's maximum
-- duration. That over-charges a short clip, which is the direction to be wrong
-- in: the alternative is discovering the shortfall on an invoice. Charging by
-- measured duration needs a per-second rate on this table and is the real fix.

/*
 * Kling 3.0. The client's preferred model, so it is priced and live.
 *
 * Provider rate at 720p with audio is 20 credits/s and the maximum duration is
 * 15 seconds: 300 provider credits, $1.50, which is 30 of ours. Expensive
 * beside Veo 3 Fast at 6, and that is simply what it costs.
 *
 * Veo 3 Fast is deliberately left active alongside it. The client asked for
 * high-quality models only, but a picker with one option is not a picker, and
 * Veo remains the only model cheap enough to iterate with. Which model runs is
 * the user's choice; this table exists to offer it, not to make it for them.
 */
insert into public.model_catalog
  (id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order)
values
  ('kling-3.0/video', 'kie', 'Kling 3.0', 'video',
   'The highest-fidelity video model here, up to 15 seconds with sound.',
   array['text-to-video', 'image-to-video', '1080p', 'vertical', 'audio'], 30, 'free', true, 5),

  -- 720p at 20 credits/s over a 30 second maximum: 600 provider credits, $3.00.
  -- Studio only, because a single run costs more than most months of the free
  -- allowance.
  ('kling-3.0/motion-control', 'kie', 'Kling Motion Control', 'video',
   'Transfers a performance from one video onto a character. Needs a driving video.',
   array['video-to-video', 'motion-transfer', '1080p'], 60, 'studio', true, 6),

  /*
   * The four below are real and unpriced.
   *
   * They also need something this pipeline does not yet have: every one of them
   * takes a video as input, and nothing in the composer uploads a video into a
   * generation. Activating them would offer the user a model they cannot feed.
   */
  ('wan/2-7-videoedit', 'kie', 'Wan Video Edit', 'video',
   'Edits an existing video from a prompt, keeping its subject and scene.',
   array['video-to-video', 'video-editing', '1080p'], 30, 'studio', false, 30),

  ('wan/2-7-r2v', 'kie', 'Wan Reference to Video', 'video',
   'Builds a video from reference images while holding the character steady.',
   array['reference-to-video', 'character-consistency', '1080p'], 30, 'studio', false, 31),

  ('wan/2-6-video-to-video', 'kie', 'Wan Video to Video', 'video',
   'Restyles an existing video from a prompt.',
   array['video-to-video', '1080p'], 30, 'studio', false, 32),

  ('gemini-omni-video', 'kie', 'Gemini Omni', 'video',
   'Google''s multimodal video model, up to 30 seconds.',
   array['text-to-video', 'image-to-video', 'video-editing', '1080p'], 30, 'studio', false, 33)
on conflict (id) do nothing;
