-- Creator testers can exercise every active, documented generation model.
-- Inactive rows remain inactive: plan eligibility is not provider readiness.
update public.model_catalog
   set min_plan = 'creator', updated_at = now()
 where is_active = true
   and id in (
     'kling-3.0/motion-control',
     'wan/2-6-video-to-video',
     'wan/2-7-videoedit',
     'wan/2-7-r2v',
     'gemini-omni-video',
     'kling/ai-avatar-pro',
     'omnihuman-1-5'
   );
