-- Kling becomes the primary video model; Veo and Wan retire for now.
--
-- Free and paid tiers each had their own workhorse before this: Veo for free,
-- Kling for creator/studio (migration 0070). Consolidating onto Kling means
-- the free tier needs a different entry point, since kling-3.0/video stays
-- creator-and-up. Seedance already is one: free-eligible, active, and priced
-- at half what Veo cost (migration 0051). Gemini Omni stays live as the
-- paid-tier backup alongside Kling, so a paying account still has a second
-- model when Kling cannot take a request.
--
-- Wan's three models retire for the same reason, not because Kling actually
-- covers their jobs. It does not: restyle, in-place video edit and
-- multi-reference character consistency have no Kling equivalent in this
-- catalogue. The product call is to run without them for now rather than
-- keep three more request shapes live.
--
-- Deactivated, not deleted. Every id below is a real, verified integration,
-- still referenced by past video_generations rows, and the code that
-- dispatches and polls it (`_shared/kie.ts`, `_shared/kie-models.ts`,
-- `_shared/kie-builders/*`) is untouched. Flipping `is_active` back on is the
-- entire reactivation, the same move migrations 0059 and 0062 already made
-- once for Kling Motion Control.
update public.model_catalog
   set is_active = false,
       updated_at = now()
 where family = 'video'
   and id in (
     'veo3',
     'veo3_fast',
     'veo3_lite',
     'wan/2-6-video-to-video',
     'wan/2-7-videoedit',
     'wan/2-7-r2v'
   );
