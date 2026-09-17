-- Two gaps found auditing the registry against what the codebase actually
-- reads today: the list from 0034 was accurate when it was written, but
-- seven real secrets have been added to the app since (HeyGen, voice
-- cloning, the kie.ai webhook signature, Apify, the admin-console-to-app
-- internal secret) and never made it into managed_secrets, so the console
-- had no idea they existed. And there was no way to add a secret the
-- registry didn't already know about at all: admin_secret_rotate refuses
-- any key not already a row, so a genuinely new credential needed a
-- migration before the console could touch it, which is the gap the "+ Add
-- secret" control needs closed to mean anything.

insert into public.managed_secrets (key, description, expected_by, location) values
  ('HEYGEN_API_KEY',         'HeyGen digital twin training and video generation.',                    'edge functions', 'supabase'),
  ('HEYGEN_CREDIT_COST',     'Credits charged per twin video. Unset refuses the run rather than guess.', 'edge functions', 'supabase'),
  ('HEYGEN_CRON_SECRET',     'Authorises the scheduled HeyGen/voice-clone pollers, separate from CRON_SECRET so the database''s own cron never needed the app''s.', 'edge functions', 'supabase'),
  ('VOICE_CLONE_CREDIT_COST','Credits charged to clone a voice. Unset refuses the run rather than guess.', 'edge functions', 'supabase'),
  ('KIE_WEBHOOK_HMAC_KEY',   'Verifies the kie.ai render callback is really from kie.ai.',            'edge functions', 'supabase'),
  ('APIFY_TOKEN',            'Discover tab scraping (TikTok, Instagram) via Apify actors.',           'web',             'vercel'),
  ('INTERNAL_API_SECRET',    'Shared secret for server-to-server calls into the app. Unset closes those routes rather than opening them.', 'web', 'vercel')
on conflict (key) do nothing;

-- render worker reads SUPABASE_SERVICE_ROLE_KEY too (services/render/src),
-- which the original row's expected_by never listed since that service
-- did not exist yet when 0034 was written.
update public.managed_secrets
  set expected_by = 'web, worker, mail, render'
  where key = 'SUPABASE_SERVICE_ROLE_KEY' and expected_by = 'web, admin, worker, mail';

/**
 * Registers a secret the console did not already know about, then rotates
 * it through the exact same path admin_secret_rotate uses so there is one
 * place that validates a value and writes the vault copy, not two.
 *
 * Location and expected_by are metadata the person adding the secret has to
 * supply themselves and get right: this function has no way to know which
 * host actually reads a name it has never seen before.
 */
create or replace function public.admin_secret_register(
  p_key text,
  p_description text,
  p_expected_by text,
  p_location text,
  p_value text,
  p_store_value boolean default false,
  p_ip inet default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  if p_key !~ '^[A-Z][A-Z0-9_]*$' then
    raise exception 'Secret names are SCREAMING_SNAKE_CASE, like the environment variable they are';
  end if;

  if exists (select 1 from managed_secrets where key = p_key) then
    raise exception 'A secret named % is already registered', p_key;
  end if;

  if coalesce(trim(p_description), '') = '' then
    raise exception 'A secret needs a description: what reads it, and what breaks without it';
  end if;

  insert into managed_secrets (key, description, expected_by, location, is_set)
  values (p_key, p_description, p_expected_by, p_location, false);

  perform admin_log_action(
    'admin.secret_registered',
    'managed_secret',
    p_key,
    'Registered ' || p_key,
    null,
    jsonb_build_object('description', p_description, 'expected_by', p_expected_by, 'location', p_location),
    p_ip
  );

  -- Rotate immediately if a value was given, through the function that
  -- already knows how to validate one and write it to the vault, rather
  -- than duplicating that here.
  if p_value is not null then
    perform admin_secret_rotate(p_key, p_value, p_store_value, p_ip);
  end if;
end; $$;

revoke all on function public.admin_secret_register(text, text, text, text, text, boolean, inet) from public, anon;
grant execute on function public.admin_secret_register(text, text, text, text, text, boolean, inet) to authenticated;
