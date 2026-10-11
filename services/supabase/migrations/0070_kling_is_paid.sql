-- Kling becomes a paid model, and Veo becomes what free accounts get.
--
-- `kling-3.0/video` was listed at `free`, which with the chooser now naming
-- models would have let a free account pull thirty-credit videos: five times
-- what the free grant was sized around, and the whole trial gone in half a
-- video. Veo stays free because it is the cheapest way to let somebody try the
-- product at all.
--
-- The avatar model stays free deliberately. Twelve credits is more than Veo,
-- but putting your own face and voice in a video is the thing most worth
-- letting somebody try before they pay, and the chooser only reaches it when
-- they have attached both.

update public.model_catalog
   set min_plan = 'creator',
       updated_at = now()
 where id = 'kling-3.0/video';
