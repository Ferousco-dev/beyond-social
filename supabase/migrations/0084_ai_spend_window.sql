-- What one user has spent on model calls over a window.
--
-- The gateway could shed load but not spend. Its limiter counts requests and
-- prompt tokens, which is not the unit the invoice arrives in: a few long calls
-- to an expensive model cost more than a flood of cheap ones, and nothing in
-- the system could tell the difference or refuse on it.
--
-- Deliberately dollars rather than credits. Credits are the product's currency
-- for video, whole numbers priced for a render costing dollars; a chat message
-- costs a fraction of a cent of text inference, and credit_ledger.delta is an
-- integer, so text spend cannot be expressed there without overcharging by
-- more than an order of magnitude.
--
-- Cached rows are included on purpose. A cache hit is recorded at zero cost, so
-- it contributes nothing to the sum, and excluding them would only cost a
-- filter. Failed attempts are included for the same reason: a failure that
-- reached the provider was still billed by it.

create or replace function public.ai_spend_usd(p_user uuid, p_since timestamptz)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost_usd), 0)::numeric
  from ai_usage
  where user_id = p_user and created_at >= p_since;
$$;

comment on function public.ai_spend_usd(uuid, timestamptz) is
  'Dollars of model spend for one user since a timestamp. Read by the AI gateway''s spend ceiling.';

-- Served entirely by ai_usage_user_time_idx (user_id, created_at desc) from 0009.
revoke all on function public.ai_spend_usd(uuid, timestamptz) from public, anon;
grant execute on function public.ai_spend_usd(uuid, timestamptz) to service_role, authenticated;
