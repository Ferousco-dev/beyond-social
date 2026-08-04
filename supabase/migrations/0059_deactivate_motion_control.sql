-- Kling Motion Control is listed and priced but cannot be run.
--
-- The model copies motion from a reference video, so `video_urls` is a required
-- input. Nothing in the generate-video request shape carries a video: the
-- composer uploads photos and voice clips, and the dispatcher only ever had a
-- still to pass. Selecting it would reserve a studio-tier credit against a
-- request the provider must reject.
--
-- The dispatcher now refuses it explicitly rather than inventing a shape, but
-- refusing at dispatch is a worse experience than not offering it: the user has
-- already written a prompt and chosen a model by then. Deactivating takes it
-- off the shelf until the request shape can carry a reference video, at which
-- point this row flips back with the code that feeds it.
update public.model_catalog
   set is_active = false,
       updated_at = now()
 where id = 'kling-3.0/motion-control';
