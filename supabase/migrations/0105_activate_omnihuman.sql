-- Turn on the last avatar model that has a documented builder.
--
-- 0104 left `omnihuman-1-5` inactive because the avatar path sent one shape to
-- every model it ran (`image_url`, `audio_url`, `prompt`, `resolution`), and
-- omnihuman disagrees with that shape in a way the provider silently accepts:
-- it reads `output_resolution` rather than `resolution` and takes values
-- without the trailing `p`. A request built for the others would have been
-- accepted, charged, and rendered at the default rather than the tier the
-- caller asked for.
--
-- `generate-avatar` now builds each model's payload from that model's own
-- documentation, so the shape omnihuman actually reads is what gets sent, and
-- the assertion suite in kie-avatars.test.ts pins the field names down.
update public.model_catalog
   set is_active = true, updated_at = now()
 where id = 'omnihuman-1-5';

-- `volcengine/video-to-video-lip-sync` stays off and deliberately.
--
-- It takes footage plus audio and re-lips the speaker with the new track, so
-- it is a different job kind rather than a photo-and-voice variant. The
-- composer does not currently express a request that carries both a video and
-- an audio to the same model, and activating it against the avatar path would
-- send a photo to a field it never reads. It will come back when the composer
-- has a lip-sync surface of its own.
