-- Model credit costs, admin-editable. model_catalog is already its own real
-- table (one row per model), so this does not go through app_config's
-- generic key/value store: it gets its own small pair of functions, mirroring
-- admin_app_config_all / admin_set_app_config's read/write and audit shape.
--
-- Lower risk than the billing plan price in migration 0122: there is no
-- external system (no Stripe price object) that this can fall out of sync
-- with. A wrong edit here just means the platform eats a loss or overcharges
-- credits for one model, not a customer being shown one price and charged
-- another. Still audit-logged like every other admin write.

/** Every model row, including inactive ones, ordered for display. Admin-gated. */
create or replace function public.admin_model_pricing_list()
returns table (
  id text,
  provider text,
  name text,
  family text,
  credit_cost integer,
  min_plan text,
  is_active boolean,
  updated_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select m.id, m.provider, m.name, m.family, m.credit_cost, m.min_plan, m.is_active, m.updated_at
  from model_catalog m
  order by m.family, m.sort_order, m.id;
end; $$;

/**
 * Sets one model's credit cost and records the change, following
 * admin_set_app_config's shape: read the current row, refuse a no-op write,
 * update, then log before/after inside the same function so no path can
 * change a price without leaving the old one in the audit log.
 */
create or replace function public.admin_set_model_credit_cost(
  p_model_id   text,
  p_credit_cost integer,
  p_reason     text,
  p_ip         inet default null
) returns table (
  id text,
  provider text,
  name text,
  family text,
  credit_cost integer,
  min_plan text,
  is_active boolean,
  updated_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  v_before model_catalog;
  v_after  model_catalog;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required';
  end if;
  if p_credit_cost < 0 then
    raise exception 'Credit cost cannot be negative';
  end if;

  select * into v_before from model_catalog m where m.id = p_model_id;
  if not found then
    raise exception 'Unknown model: %', p_model_id;
  end if;

  if v_before.credit_cost = p_credit_cost then
    return query select v_before.id, v_before.provider, v_before.name, v_before.family,
                        v_before.credit_cost, v_before.min_plan, v_before.is_active, v_before.updated_at;
    return;
  end if;

  update model_catalog m
  set credit_cost = p_credit_cost
  where m.id = p_model_id
  returning * into v_after;

  perform admin_log_action(
    'model.credit_cost_set',
    'model',
    p_model_id,
    format('Set %s credit_cost from %s to %s', p_model_id, v_before.credit_cost, v_after.credit_cost),
    jsonb_build_object('credit_cost', v_before.credit_cost),
    jsonb_build_object('credit_cost', v_after.credit_cost),
    p_ip
  );

  return query select v_after.id, v_after.provider, v_after.name, v_after.family,
                      v_after.credit_cost, v_after.min_plan, v_after.is_active, v_after.updated_at;
end; $$;

grant execute on function public.admin_model_pricing_list() to authenticated;
grant execute on function public.admin_set_model_credit_cost(text, integer, text, inet) to authenticated;
