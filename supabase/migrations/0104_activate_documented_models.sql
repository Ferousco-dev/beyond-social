-- Turn on every model this dispatcher can actually address.
--
-- Nine of fifteen catalogue rows were inactive, and each for a different
-- reason. Three of those reasons have now gone away, and one of them was
-- breaking a feature that the audit listed as working.

/*
 * 1. The avatar default was switched off, so no avatar could be made at all.
 *
 * `generate-avatar` falls back to `infinitalk/from-audio` when the caller does
 * not name a model, and the web client never names one, so every photo and
 * voice render resolved to a row with `is_active = false` and came back "That
 * avatar model is not available". The talking head is the one avatar path that
 * does not need HeyGen, and it has been returning 503 to everybody.
 *
 * Its shape was never the problem. docs.kie.ai/market/infinitalk/from-audio
 * documents image_url, audio_url, prompt and resolution, which is exactly what
 * `createAvatarTask` sends.
 */
update public.model_catalog
   set is_active = true, updated_at = now()
 where id = 'infinitalk/from-audio';

/*
 * 2. Veo 3 and Veo 3 Lite are for free accounts.
 *
 * Both shipped inactive in 0037 with a note that a credit cost for them would
 * be invented. 0051 priced them from kie's published rates, 12 and 3, and
 * nobody came back to flip the flag, so the cheapest model in the catalogue has
 * been dark for a month for a reason that stopped being true.
 *
 * They need no dispatcher work: `generate-video` routes anything whose id
 * starts with "veo" through the dedicated Veo endpoint, and `poll-generation`
 * reads it back the same way.
 */
update public.model_catalog
   set is_active = true, min_plan = 'free', updated_at = now()
 where id in ('veo3', 'veo3_lite');

/*
 * 3. The four market models whose request shapes are now read rather than
 *    guessed.
 *
 * Each was inactive because `buildMarketInput` had no entry for it, and a model
 * with no entry is refused rather than sent a shape that might be wrong. Each
 * now has a builder written from its own page on docs.kie.ai:
 *
 *   wan/2-6-video-to-video   video_urls (array), duration as "5" or "10"
 *   wan/2-7-videoedit        video_url (one string), reference_image (one)
 *   wan/2-7-r2v              reference_image + reference_video, no image_urls
 *   gemini-omni-video        image_urls + video_list objects, duration a string
 *
 * The 2.6 restyle row is the notable one. It was held back because its fields
 * were inferred from its siblings rather than confirmed, and being wrong costs
 * thirty credits an attempt. The documentation confirms the inference was
 * right, so it goes live without anybody paying to find out.
 */
update public.model_catalog
   set is_active = true, updated_at = now()
 where id in (
   'wan/2-6-video-to-video',
   'wan/2-7-videoedit',
   'wan/2-7-r2v',
   'gemini-omni-video'
 );

/*
 * Two avatar rows stay off, and deliberately.
 *
 * `omnihuman-1-5` and `volcengine/video-to-video-lip-sync` have not had their
 * schemas read, and the avatar path sends one shape to every model it runs,
 * which is the arrangement the video path was rebuilt to get rid of. Turning
 * them on would be the same silent failure: a field name nobody checked, a
 * request the provider accepts, and an input dropped from a video that was
 * paid for. They come back when the avatar dispatcher can address them by name.
 */
