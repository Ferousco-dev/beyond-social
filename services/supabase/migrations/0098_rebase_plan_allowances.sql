-- Give a new account the fifteen videos the free plan advertises.
--
-- The signup grant has been 15 since 0037, when one credit meant one veo3_fast
-- render and fifteen credits was fifteen videos. Migration 0051 made a credit
-- five cents of provider cost, multiplied the ledger and every model price by
-- six, and did not touch this line or the allowances in
-- `apps/web/src/lib/billing/plans.ts`.
--
-- So the arithmetic has been wrong for a month in the direction that matters:
-- veo3_fast costs 6 credits now, and a new account was given 15, which is two
-- videos and a bit on a plan whose pricing page promises fifteen.
--
-- Ninety is the same fifteen videos at the rebased price. It is a correction,
-- not a giveaway: nobody is being given more than the plan already said.
--
-- The paid allowances live only in `plans.ts`, because the subscription grant
-- reads `PLAN_CATALOGUE[plan].credits` and passes it to
-- `billing_apply_subscription`. This one is here because signup has no
-- webhook to carry a number, so the trigger has to hold it.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');

  -- Keep in step with PLAN_CATALOGUE.free.credits in apps/web/src/lib/billing.
  -- 90 credits is 15 videos at veo3_fast's 6, which is what the plan advertises.
  perform public.grant_credits(new.id, 90, 'signup:free', 'signup:' || new.id);
  return new;
end; $$;
