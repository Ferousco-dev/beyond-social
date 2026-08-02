-- An avatar render costs three credits, not two.
--
-- The first figure priced the render alone. A finished avatar is more than one
-- call: the clip is prepared, the render runs, and the result is stored, and a
-- render is longer than an ordinary video, so two under-recovered on every one.
update public.model_catalog
set credit_cost = 3, updated_at = now()
where id = 'infinitalk/from-audio';
