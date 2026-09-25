-- Discover's "use as inspiration" analysis starts costing credits, and a new
-- "deep" tier that actually watches the video joins it.
--
-- Every other AI call the user can trigger by hand already costs credits.
-- This one did not: `analysePost` ran the judge model on the platform's own
-- account with nothing charged to the caller, which is the exact gap that
-- made "nothing is free" worth saying out loud. Two catalogue rows, priced
-- like everything else: `family = 'analysis'` joins video/image/chat/audio/
-- avatar rather than inventing a second pricing mechanism next to
-- `model_catalog`, so both rows are admin-editable through the same
-- `admin_model_pricing_list` / `admin_set_model_credit_cost` pair every
-- other model already goes through, and `can_run_model` already works
-- against them unchanged: it looks up a row by id with no family filter.
--
-- Pricing: `discover.inspiration` at 1 credit is the cheap tier, a text-only
-- judge call on the caption and engagement numbers, priced the same as this
-- catalogue's cheapest video run. `discover.inspiration-deep` at 6 is a
-- guess in the direction the repo's own pricing rows already guess when the
-- real number is not known (migration 0057, 0058): Gemini bills video input
-- by the second at a materially higher token rate than text, a scraped
-- clip's length is not known until it is fetched, and over-charging a short
-- clip is the side to be wrong on rather than losing money on every deep
-- analysis without anyone noticing. Revisit both once real usage shows the
-- actual token cost.
alter table public.model_catalog drop constraint if exists model_catalog_family_check;
alter table public.model_catalog add constraint model_catalog_family_check
  check (family = any (array['video', 'image', 'chat', 'audio', 'avatar', 'analysis']));

insert into public.model_catalog
  (id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order)
values
  ('discover.inspiration', 'gemini', 'Post analysis', 'analysis',
   'Works out a post''s repeatable format from its caption and engagement numbers.',
   array['text-analysis'], 1, 'free', true, 1),

  ('discover.inspiration-deep', 'gemini', 'Deep post analysis', 'analysis',
   'Watches the actual video and analyses tone, setting and structure from what it sees.',
   array['video-analysis'], 6, 'free', true, 2)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Debit / refund, for a feature that is not a generation
-- ---------------------------------------------------------------------------
--
-- No `video_generations` row exists to hang this charge off, so these read
-- the model, lock the caller's ledger and debit or refund it directly, the
-- same discipline `reserve_generation_credits_at` applies for a generation.
--
-- `p_user uuid` rather than `auth.uid()`, and service_role only below: the
-- existing `grant_credits` is the precedent (0037) for exactly this shape,
-- and it is not an arbitrary stylistic match. `profiles_guard_privileged_columns`
-- (0036) blocks an account holder from changing their own `credits_total` /
-- `credits_used` cache columns, which the ledger trigger updates on every
-- write; it allows the change only when the acting `auth.uid()` is distinct
-- from the profile's own id (or the caller is an admin). A security-definer
-- function called directly by the user's own session still carries that
-- user's `auth.uid()`, so a client-callable debit would trip its own
-- account's guard on every call. Routing through the service role, the way
-- every other credit-charging RPC in this codebase already does, is what
-- makes `auth.uid()` distinct from the row being updated in the first place.
create or replace function public.debit_model_credits(
  p_user uuid,
  p_model text,
  p_external_ref text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model public.model_catalog;
  v_balance integer;
begin
  if p_user is null then
    return false;
  end if;

  select * into v_model from public.model_catalog where id = p_model;
  if not found or not v_model.is_active then
    return false;
  end if;

  if p_external_ref is not null
     and exists (select 1 from public.credit_ledger where external_ref = p_external_ref) then
    return true;
  end if;

  perform 1 from public.credit_ledger where user_id = p_user for update;

  select coalesce(sum(delta), 0) into v_balance
    from public.credit_ledger where user_id = p_user;

  if v_balance < v_model.credit_cost then
    return false;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, kind, external_ref)
  values (p_user, -v_model.credit_cost, p_model, 'debit', p_external_ref)
  on conflict (external_ref) where external_ref is not null do nothing;

  return true;
end;
$$;

/**
 * Gives back a `debit_model_credits` charge identified by its own external
 * ref, for the one failure mode that deserves one: the call to the provider
 * never produced a usable result. A weak or low-confidence analysis is still
 * the thing that was paid for and is not refunded; this is for when nothing
 * came back at all.
 *
 * Reads the debit rather than assuming its amount, the same rule
 * `fail_generation_by_id` follows, and the same `on conflict ... do nothing`
 * keeps a retried refund from paying out twice.
 */
create or replace function public.refund_model_credits(p_external_ref text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debit public.credit_ledger;
begin
  select * into v_debit from public.credit_ledger
    where external_ref = p_external_ref and kind = 'debit'
    limit 1;
  if not found then
    return false;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, kind, external_ref)
  values (v_debit.user_id, -v_debit.delta, v_debit.reason || ':refund', 'refund',
          'refund:' || p_external_ref)
  on conflict (external_ref) where external_ref is not null do nothing;

  return true;
end;
$$;

revoke all on function public.debit_model_credits(uuid, text, text) from public, anon, authenticated;
revoke all on function public.refund_model_credits(text) from public, anon, authenticated;
grant execute on function public.debit_model_credits(uuid, text, text) to service_role;
grant execute on function public.refund_model_credits(text) to service_role;
