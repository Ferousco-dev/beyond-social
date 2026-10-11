-- Operational metadata for prepaid provider credits. These values are entered
-- by an admin because neither provider exposes a reliable balance-and-expiry
-- endpoint used by this application. They contain no credentials.

insert into public.app_config (key, area, value, value_type, description, takes_effect) values
  (
    'provider_credits.heygen',
    'provider_credits',
    '{"remainingCredits":null,"expiresAt":null,"warningDays":30}'::jsonb,
    'json',
    'Admin-maintained HeyGen API credit balance and expiry. The admin overview warns before expiry.',
    'immediate'
  ),
  (
    'provider_credits.kie',
    'provider_credits',
    '{"remainingCredits":null,"expiresAt":null,"warningDays":14}'::jsonb,
    'json',
    'Admin-maintained kie.ai credit balance and expiry. The admin overview warns before expiry.',
    'immediate'
  )
on conflict (key) do nothing;

-- Creating a custom HeyGen Digital Twin through the API is enterprise-only.
-- The current account is not enterprise, so the safe default is off. Existing
-- photo-plus-audio avatar models remain available through kie.ai.
insert into public.feature_flags (key, enabled, description) values
  (
    'heygen_custom_avatars',
    false,
    'Allow custom HeyGen Digital Twin training. Enable only with Enterprise API access.'
  )
on conflict (key) do nothing;
