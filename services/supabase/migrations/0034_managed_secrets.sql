-- The secrets registry: what the platform needs, whether it is set, and when it
-- was last rotated.
--
-- The rule this file exists to enforce: a secret value is never readable from
-- the browser, and nothing here provides a path to one. There is no value
-- column on `managed_secrets`, and there is no function that returns plaintext.
-- Values, when an admin chooses to keep a copy, go into Supabase Vault
-- (`supabase_vault` 0.3.1, verified present on this database) which stores them
-- authenticated-encrypted with a key held outside the table. Reading them back
-- needs `vault.decrypted_secrets`, and the `vault` schema grants USAGE only to
-- `supabase_admin`, `postgres` and `service_role`. `authenticated` has none, so
-- there is no route from a console session to a value even if a definer
-- function were added later by mistake.
--
-- The registry also never asks the running process what its environment holds.
-- A page that printed `process.env` would report the console's own deploy, not
-- the worker's or the edge runtime's, and would go stale silently. Every field
-- here is written by an explicit, audited rotation instead.

create table if not exists public.managed_secrets (
  key              text primary key check (key ~ '^[A-Z][A-Z0-9_]{2,60}$'),
  description      text not null default '',
  -- Which service actually reads this value, so an operator knows what breaks
  -- when it is wrong and what to restart when it changes.
  expected_by      text not null,
  -- Where the value is configured. This drives the "needs a redeploy" warning
  -- in the console, which differs per host.
  location         text not null check (location in ('vercel', 'supabase', 'host')),
  -- Enough to tell two keys apart in a provider console. Four characters of a
  -- high-entropy string identifies nothing on its own.
  last_four        text check (char_length(last_four) = 4),
  is_set           boolean not null default false,
  -- Handle into vault.secrets when an admin kept an encrypted copy. A handle,
  -- not a value: resolving it needs privileges the console does not have.
  vault_secret_id  uuid,
  rotated_at       timestamptz,
  rotated_by       uuid references auth.users (id) on delete set null,
  -- Copied at write time, so deleting the account cannot orphan the record of
  -- who rotated a production credential. Same reasoning as admin_audit_log.
  rotated_by_email text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- A row claiming to be set must be able to say which key it is and when it
  -- got there, otherwise the registry is decoration.
  constraint managed_secrets_set_is_evidenced
    check (not is_set or (last_four is not null and rotated_at is not null)),
  -- A stored value belongs to a set secret. Clearing one drops the other.
  constraint managed_secrets_stored_value_is_set
    check (vault_secret_id is null or is_set)
);

comment on table public.managed_secrets is
  'Secret metadata only. There is deliberately no value column: see 0034.';

alter table public.managed_secrets enable row level security;

-- No policy of any kind, for any role. RLS denies by default, so a direct
-- PostgREST read returns nothing and every access goes through the admin-gated
-- functions below. That also keeps `vault_secret_id` out of client reach.
revoke all on public.managed_secrets from anon, authenticated;

create or replace function public.touch_managed_secret()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists managed_secrets_touch on public.managed_secrets;
create trigger managed_secrets_touch
  before update on public.managed_secrets
  for each row execute function public.touch_managed_secret();

/**
 * The registry as the console renders it.
 *
 * Returns `has_stored_value` rather than `vault_secret_id`: the console needs
 * to know whether a copy exists, never how to reach it.
 */
create or replace function public.admin_secrets_list()
returns table (
  key text,
  description text,
  expected_by text,
  location text,
  last_four text,
  is_set boolean,
  has_stored_value boolean,
  rotated_at timestamptz,
  rotated_by_email text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  select
    s.key, s.description, s.expected_by, s.location, s.last_four, s.is_set,
    s.vault_secret_id is not null, s.rotated_at, s.rotated_by_email
  from managed_secrets s
  -- Unset first: the registry's job is to surface what is missing.
  order by s.is_set, s.key;
end; $$;

/**
 * Records a rotation, and optionally keeps an encrypted copy of the value.
 *
 * The value is an input and never an output. It is used for exactly two things:
 * deriving `last_four`, and encrypting into the vault when `p_store_value` is
 * true. Nothing returns it, and the audit row carries only metadata.
 *
 * Storing a copy does not configure anything. The value still has to be set in
 * the provider that owns it, and for a Vercel or edge-function secret the
 * process only sees the new value after a redeploy. The console says so.
 */
create or replace function public.admin_secret_rotate(
  p_key text,
  p_value text,
  p_store_value boolean default false,
  p_ip inet default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_secret managed_secrets;
  v_last_four text;
  v_vault_id uuid;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_secret from managed_secrets where key = p_key;
  if not found then
    raise exception 'Unknown secret %', p_key;
  end if;

  -- Short enough that the last four would be most of it, or that it is a
  -- placeholder rather than a credential.
  if p_value is null or char_length(p_value) < 12 then
    raise exception 'A secret value must be at least 12 characters';
  end if;

  v_last_four := right(p_value, 4);
  v_vault_id := v_secret.vault_secret_id;

  if p_store_value then
    if v_vault_id is null then
      v_vault_id := vault.create_secret(
        p_value,
        'managed_secret:' || p_key,
        'Encrypted copy held for ' || p_key || '. Rotate through admin_secret_rotate.'
      );
    else
      perform vault.update_secret(v_vault_id, p_value);
    end if;
  elsif v_vault_id is not null then
    -- The stored copy is now a previous value. Keeping it would make the
    -- registry assert something false about the current credential.
    delete from vault.secrets where id = v_vault_id;
    v_vault_id := null;
  end if;

  update managed_secrets set
    last_four        = v_last_four,
    is_set           = true,
    vault_secret_id  = v_vault_id,
    rotated_at       = now(),
    rotated_by       = auth.uid(),
    rotated_by_email = coalesce((select u.email from auth.users u where u.id = auth.uid()), 'unknown')
  where key = p_key;

  perform admin_log_action(
    'admin.secret_rotated',
    'managed_secret',
    p_key,
    'Rotated ' || p_key || case when p_store_value then ' and stored an encrypted copy' else '' end,
    jsonb_build_object(
      'is_set', v_secret.is_set,
      'last_four', v_secret.last_four,
      'rotated_at', v_secret.rotated_at,
      'has_stored_value', v_secret.vault_secret_id is not null
    ),
    jsonb_build_object(
      'is_set', true,
      'last_four', v_last_four,
      'rotated_at', now(),
      'has_stored_value', v_vault_id is not null
    ),
    p_ip
  );
end; $$;

/**
 * Marks a secret as no longer set and destroys any encrypted copy. Used when a
 * credential is revoked at the provider, so the registry stops claiming a key
 * is in place that no longer works.
 */
create or replace function public.admin_secret_clear(
  p_key text,
  p_ip inet default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_secret managed_secrets;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_secret from managed_secrets where key = p_key;
  if not found then
    raise exception 'Unknown secret %', p_key;
  end if;

  if v_secret.vault_secret_id is not null then
    delete from vault.secrets where id = v_secret.vault_secret_id;
  end if;

  update managed_secrets set
    last_four        = null,
    is_set           = false,
    vault_secret_id  = null,
    rotated_at       = now(),
    rotated_by       = auth.uid(),
    rotated_by_email = coalesce((select u.email from auth.users u where u.id = auth.uid()), 'unknown')
  where key = p_key;

  perform admin_log_action(
    'admin.secret_cleared',
    'managed_secret',
    p_key,
    'Marked ' || p_key || ' as not set',
    jsonb_build_object(
      'is_set', v_secret.is_set,
      'last_four', v_secret.last_four,
      'has_stored_value', v_secret.vault_secret_id is not null
    ),
    jsonb_build_object('is_set', false, 'last_four', null, 'has_stored_value', false),
    p_ip
  );
end; $$;

grant execute on function public.admin_secrets_list() to authenticated;
grant execute on function public.admin_secret_rotate(text, text, boolean, inet) to authenticated;
grant execute on function public.admin_secret_clear(text, inet) to authenticated;

-- The secrets the platform actually reads today, taken from the env schemas in
-- apps/web, apps/admin, apps/worker, services/mail and supabase/functions. Only
-- server-side values: NEXT_PUBLIC_* is inlined into the browser bundle and is
-- not a secret. `on conflict do nothing` keeps re-runs from clearing rotations.
insert into public.managed_secrets (key, description, expected_by, location) values
  ('SUPABASE_SERVICE_ROLE_KEY', 'Bypasses RLS. Every cross-tenant admin read and every worker write uses it.', 'web, admin, worker, mail', 'vercel'),
  ('ANTHROPIC_API_KEY',         'Claude calls behind prompt enhancement and chat.',                             'web',                     'vercel'),
  ('OPENAI_API_KEY',            'Embedding fallback for the prompt engine.',                                    'web',                     'vercel'),
  ('VOYAGE_API_KEY',            'Primary embedder for the prompt corpus.',                                      'web',                     'vercel'),
  ('GEMINI_API_KEY',            'Secondary model provider.',                                                    'web',                     'vercel'),
  ('STRIPE_SECRET_KEY',         'Checkout and subscription management. Differs between test and live mode.',    'web',                     'vercel'),
  ('STRIPE_WEBHOOK_SECRET',     'Verifies Stripe webhook signatures. Wrong value means every event is dropped.','web',                     'vercel'),
  ('TIKTOK_CLIENT_SECRET',      'TikTok OAuth and publishing.',                                                 'web, worker',             'vercel'),
  ('META_APP_SECRET',           'Instagram and Facebook OAuth and publishing.',                                 'web, worker',             'vercel'),
  ('GOOGLE_CLIENT_SECRET',      'YouTube OAuth and publishing.',                                                'web, worker',             'vercel'),
  ('FIRECRAWL_API_KEY',         'Trend discovery crawls.',                                                      'web',                     'vercel'),
  ('CRON_SECRET',               'Shared secret for scheduled jobs. Unset disables the discovery endpoint.',     'web',                     'vercel'),
  ('KIE_API_KEY',               'kie.ai video generation.',                                                     'edge functions',          'supabase'),
  ('KIE_CALLBACK_SECRET',       'Authenticates the kie.ai render webhook.',                                     'edge functions',          'supabase'),
  ('MAIL_PROVIDER_API_KEY',     'Transactional email. Unset makes the service mark deliveries blocked.',        'mail',                    'host'),
  ('REDIS_URL',                 'BullMQ connection for the publishing and mail queues.',                        'worker, mail',            'host')
on conflict (key) do nothing;
