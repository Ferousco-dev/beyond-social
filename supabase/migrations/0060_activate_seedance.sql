-- Seedance 1.5 Pro can be dispatched now, so it can be sold.
--
-- It was added inactive with a stated reason: the dispatcher only knew the veo
-- endpoint, so activating it would have reserved a credit and then sent a
-- request the provider rejects. That reason is gone. The market endpoint routes
-- it, and its input shape is mapped from its own documentation: `input_urls`
-- for up to two stills, a required `aspect_ratio`, and a duration of 4 to 12
-- seconds rather than veo's fixed 4, 6 or 8.
--
-- Twelve seconds against veo's eight is the point. Veo is the cheap tier, and
-- pinning every model to its ceiling made the expensive models pointless.
update public.model_catalog
   set is_active = true,
       capabilities = array['text-to-video', 'image-to-video', '1080p', 'vertical', 'long-form'],
       updated_at = now()
 where id = 'bytedance/seedance-1.5-pro';
