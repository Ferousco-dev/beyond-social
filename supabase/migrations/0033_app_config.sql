-- Runtime configuration: the safe half of "environment variables".
--
-- Secrets do not live here and never will. What lives here are the operational
-- numbers that decide how the platform behaves under load: rate limit capacity,
-- provider timeouts, circuit breaker thresholds, discovery bounds. They are the
-- values an operator wants to change at 3am without a deploy, and the values
-- whose silent drift turns an outage into a mystery.
--
-- Two rules make this trustworthy. Reads and writes both go through admin-gated
-- SECURITY DEFINER functions, following public.admin_platform_stats. And every
-- write records the before and after value in admin_audit_log, inside the same
-- function, so a change that cannot be audited cannot happen.

/**
 * Whether a jsonb value matches its declared type.
 *
 * Enforced as a table check rather than in the application, because the whole
 * value of a typed accessor is that a page cannot be handed a string where it
 * expected a number. A constraint holds for every writer; a validator only
 * holds for the writers that remember to call it.
 */
create or replace function public.app_config_value_matches(p_value jsonb, p_type text)
returns boolean language sql immutable set search_path = public as $$
  select case p_type
    when 'string'  then jsonb_typeof(p_value) = 'string'
    when 'number'  then jsonb_typeof(p_value) = 'number'
    when 'boolean' then jsonb_typeof(p_value) = 'boolean'
    when 'json'    then jsonb_typeof(p_value) in ('object', 'array')
    else false
  end;
$$;

create table if not exists public.app_config (
  key              text primary key check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'),
  area             text not null check (area ~ '^[a-z0-9_.]{2,40}$'),
  value            jsonb not null,
  value_type       text not null check (value_type in ('string', 'number', 'boolean', 'json')),
  -- Names the file that reads the value. A key whose description cannot name a
  -- consumer is a setting nothing consumes, and does not belong here.
  description      text not null check (length(description) > 0),
  -- Honesty about blast radius: 'immediate' means a running process reads this
  -- row per use, 'redeploy' means the consuming code still holds a constant and
  -- the stored value is the recorded intent until that code reads the table.
  takes_effect     text not null default 'redeploy' check (takes_effect in ('immediate', 'redeploy')),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id) on delete set null,
  -- Copied at write time, so deleting the account cannot orphan the record of
  -- who last changed a value.
  updated_by_email text,
  constraint app_config_value_typed check (public.app_config_value_matches(value, value_type))
);

alter table public.app_config enable row level security;

-- Admins read through the definer function below, but a direct select is
-- allowed so a future generated-types client is not blocked. Nobody else gets
-- any access at all, and there is no write policy: writes go through
-- admin_set_app_config so they cannot skip the audit row.
drop policy if exists "admins read app config" on public.app_config;
create policy "admins read app config" on public.app_config
  for select using (is_admin());

revoke insert, update, delete on public.app_config from authenticated, anon;

/** Every configuration row, ordered for display. Admin-gated in the body. */
create or replace function public.admin_app_config_all()
returns table (
  key text,
  area text,
  value jsonb,
  value_type text,
  description text,
  takes_effect text,
  updated_at timestamptz,
  updated_by_email text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select c.key, c.area, c.value, c.value_type, c.description,
         c.takes_effect, c.updated_at, c.updated_by_email
  from app_config c
  order by c.area, c.key;
end; $$;

/**
 * Sets one value and records the change.
 *
 * The audit write is inside this function on purpose. Configuration with no
 * history is how a one-line change becomes an unexplainable incident three
 * weeks later, so there is no code path that can change a value without leaving
 * the old one behind.
 */
create or replace function public.admin_set_app_config(
  p_key text,
  p_value jsonb,
  p_ip inet default null
)
returns table (
  key text,
  area text,
  value jsonb,
  value_type text,
  description text,
  takes_effect text,
  updated_at timestamptz,
  updated_by_email text
) language plpgsql security definer set search_path = public as $$
declare
  v_before app_config;
  v_after  app_config;
  v_email  text;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_before from app_config c where c.key = p_key;
  if not found then
    raise exception 'Unknown config key: %', p_key;
  end if;

  if not app_config_value_matches(p_value, v_before.value_type) then
    raise exception 'Value for % must be of type %', p_key, v_before.value_type;
  end if;

  if v_before.value = p_value then
    -- A no-op write would add an audit row saying nothing changed, which makes
    -- the log harder to read for no gain.
    return query select v_before.key, v_before.area, v_before.value, v_before.value_type,
                        v_before.description, v_before.takes_effect,
                        v_before.updated_at, v_before.updated_by_email;
    return;
  end if;

  select u.email into v_email from auth.users u where u.id = auth.uid();

  update app_config c
  set value = p_value,
      updated_at = now(),
      updated_by = auth.uid(),
      updated_by_email = coalesce(v_email, 'unknown')
  where c.key = p_key
  returning * into v_after;

  perform admin_log_action(
    'admin.config_set',
    'app_config',
    p_key,
    format('Set %s to %s', p_key, p_value::text),
    jsonb_build_object('value', v_before.value),
    jsonb_build_object('value', v_after.value),
    p_ip
  );

  return query select v_after.key, v_after.area, v_after.value, v_after.value_type,
                      v_after.description, v_after.takes_effect,
                      v_after.updated_at, v_after.updated_by_email;
end; $$;

grant execute on function public.admin_app_config_all() to authenticated;
grant execute on function public.admin_set_app_config(text, jsonb, inet) to authenticated;

-- Seeds. Every key below mirrors a constant that exists in this repository
-- today, and its description names the file that reads it. None is marked
-- 'immediate', because the consuming code still holds the constant: these rows
-- record the intended value and its history, and the console says so rather
-- than claiming an effect that has not been verified.
insert into public.app_config (key, area, value, value_type, description) values
  ('ai_gateway.request_timeout_ms', 'ai_gateway', '60000', 'number',
   'Milliseconds a single provider call may take before it is aborted. Read as DEFAULT_TIMEOUT_MS in packages/ai-gateway/src/gateway.ts.'),
  ('ai_gateway.retry_attempts', 'ai_gateway', '3', 'number',
   'Total attempts per model, including the first. Read as DEFAULT_RETRY.attempts in packages/ai-gateway/src/gateway.ts.'),
  ('ai_gateway.retry_base_delay_ms', 'ai_gateway', '500', 'number',
   'First backoff delay between retries, doubled per attempt. Read as DEFAULT_RETRY.baseDelayMs in packages/ai-gateway/src/gateway.ts.'),
  ('ai_gateway.retry_max_delay_ms', 'ai_gateway', '8000', 'number',
   'Ceiling on the backoff delay. Read as DEFAULT_RETRY.maxDelayMs in packages/ai-gateway/src/gateway.ts.'),
  ('ai_gateway.response_cache_ttl_ms', 'ai_gateway', '3600000', 'number',
   'How long a cached completion stays valid. Read as DEFAULT_CACHE_TTL_MS in packages/ai-gateway/src/gateway.ts.'),
  ('ai_gateway.output_token_reserve', 'ai_gateway', '4096', 'number',
   'Tokens held back for the response when fitting a prompt to the context window. Read as DEFAULT_OUTPUT_RESERVE in packages/ai-gateway/src/gateway.ts.'),
  ('ai_gateway.breaker_failure_threshold', 'ai_gateway', '5', 'number',
   'Consecutive failures before a provider is tripped open. Read as DEFAULTS.threshold in packages/ai-gateway/src/breaker.ts.'),
  ('ai_gateway.breaker_cooldown_ms', 'ai_gateway', '30000', 'number',
   'How long a tripped provider stays out before a trial call. Read as DEFAULTS.cooldownMs in packages/ai-gateway/src/breaker.ts.'),
  ('ai_limits.token_bucket_capacity', 'ai_limits', '120000', 'number',
   'Prompt-token burst allowed per process before the in-process limiter refuses. Read in apps/web/src/lib/prompt-engine/providers.ts.'),
  ('ai_limits.token_bucket_refill_per_sec', 'ai_limits', '400', 'number',
   'Prompt tokens returned to the in-process bucket each second. Read in apps/web/src/lib/prompt-engine/providers.ts.'),
  ('ai_limits.shared_hourly_calls', 'ai_limits', '120', 'number',
   'AI calls per user per hour enforced across instances by the shared counter. Read in apps/web/src/lib/prompt-engine/providers.ts.'),
  ('ai_limits.shared_window_seconds', 'ai_limits', '3600', 'number',
   'Length of the shared AI rate limit window. Read in apps/web/src/lib/prompt-engine/providers.ts.'),
  ('public_api.rate_limit_capacity', 'public_api', '60', 'number',
   'Request burst allowed per API caller. Read in apps/web/src/lib/api/rate-limit.ts.'),
  ('public_api.rate_limit_refill_per_sec', 'public_api', '1', 'number',
   'Requests returned to an API caller''s bucket each second. Read in apps/web/src/lib/api/rate-limit.ts.'),
  ('trends.pages_per_category', 'trends', '3', 'number',
   'Pages Firecrawl fetches per category on a discovery run. Read as PAGES_PER_CATEGORY in apps/web/src/lib/trends/discover.ts.'),
  ('trends.max_per_category', 'trends', '6', 'number',
   'Upper bound on trends kept per category, which bounds the cost of one run. Read as MAX_TRENDS_PER_CATEGORY in apps/web/src/lib/trends/discover.ts.'),
  ('trends.scrape_timeout_ms', 'trends', '45000', 'number',
   'Milliseconds a single Firecrawl scrape may take. Read as TIMEOUT_MS in apps/web/src/lib/trends/firecrawl.ts.')
on conflict (key) do nothing;
