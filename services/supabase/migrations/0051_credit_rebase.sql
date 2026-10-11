-- Re-base credits so a price can be told from a price.
--
-- One credit meant one veo3_fast render, which is about thirty cents of
-- provider cost. Everything else has to round to a whole number of those, and
-- the models we want to offer span twelve to one: an avatar at 480p costs
-- twelve cents and a 2K render costs a dollar forty six. On the old scale both
-- round to the same number, so we would lose money on some and overcharge on
-- others with no way to express the difference.
--
-- One credit is now five cents of provider cost, which makes veo3_fast six.
-- Everything multiplies by that same six, so no balance gains or loses value.
--
-- The ledger is the source of truth and `profiles` is a cache derived from
-- sum(delta), so the ledger is what moves and the cache is recomputed. Writing
-- the cache directly would leave it disagreeing with the rows behind it.

-- Named rather than inlined so the arithmetic can be checked afterwards, and so
-- a later reader can tell a re-base from an ordinary correction.
do $$
declare
  v_factor constant integer := 6;
  v_user uuid;
begin
  update public.credit_ledger set delta = delta * v_factor;

  -- Recomputed per user because that is the granularity the function works at.
  for v_user in select distinct user_id from public.credit_ledger loop
    perform public.refresh_credit_cache(v_user);
  end loop;
end $$;

-- Re-priced on the new scale, at eight seconds, from kie's published rates.
update public.model_catalog set credit_cost = 6, updated_at = now() where id = 'veo3_fast';
update public.model_catalog set credit_cost = 12, updated_at = now() where id = 'veo3';
update public.model_catalog set credit_cost = 3, updated_at = now() where id = 'veo3_lite';

-- Priced at 480p, which is what the avatar path now asks for. A talking head on
-- a phone is hard to tell from 720p, and 720p is four times the cost.
update public.model_catalog set credit_cost = 3, updated_at = now()
  where id = 'infinitalk/from-audio';

/*
 * The models this makes room for.
 *
 * All inactive. Every one of them is dispatched through `jobs/createTask`
 * rather than the veo endpoint the video path currently calls, so activating
 * one before that routing exists would send a request the provider rejects,
 * after the credit has already been reserved.
 */
insert into public.model_catalog
  (id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order)
values
  ('bytedance/seedance-1.5-pro', 'kie', 'Seedance 1.5 Pro', 'video',
   'Fast, inexpensive video. Less than half the cost of veo for a similar length.',
   array['text-to-video', 'image-to-video', '720p', 'vertical'], 3, 'free', false, 20),

  ('kling-3.0-turbo', 'kie', 'Kling 3.0 Turbo', 'video',
   'Higher fidelity video at 720p or 1080p, for work that will be looked at closely.',
   array['text-to-video', 'image-to-video', '1080p', 'vertical'], 15, 'studio', false, 21),

  ('volcengine/lip-sync', 'kie', 'Volcengine Lip Sync', 'avatar',
   'Lip syncs a photo to an audio track. The cheapest of the avatar models.',
   array['image-to-video', 'lip-sync', 'audio-driven', 'vertical'], 7, 'free', false, 22),

  ('omnihuman-1-5', 'kie', 'OmniHuman 1.5', 'avatar',
   'The best of the avatar models, and the most expensive. Fuller body motion.',
   array['image-to-video', 'lip-sync', 'audio-driven', 'vertical'], 22, 'studio', false, 23)
on conflict (id) do nothing;
