-- Motion Control can be dispatched now, so it goes back on the shelf.
--
-- It was deactivated in 0059 for one reason: it copies motion from a reference
-- video and nothing in the request shape could carry one, so selecting it could
-- only ever have taken a studio-tier credit and failed at the provider.
--
-- The dispatcher reads video now. Footage is uploaded to its own bucket and
-- handed to the provider as bytes, and the model's inputs are mapped from its
-- own documentation: `input_urls` for the photo of the person, `video_urls`
-- for the motion being copied, both arrays of exactly one, both required. A
-- request missing either is refused before anything is spent.
update public.model_catalog
   set is_active = true,
       updated_at = now()
 where id = 'kling-3.0/motion-control';
