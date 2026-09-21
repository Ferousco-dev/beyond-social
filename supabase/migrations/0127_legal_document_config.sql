-- Public legal pages start as explicit launch placeholders. Admins edit the
-- structured copy through the console and may publish it after legal review.

insert into public.app_config (key, area, value, value_type, description, takes_effect) values
  (
    'legal.privacy',
    'legal',
    '{"status":"coming_soon","title":"Privacy policy","summary":"Our privacy policy is being prepared for launch.","body":"We are documenting what data Beyond Social stores, which service providers process it, how long it is retained, and how you can request access or deletion. Contact hello@beyondsocial.app with questions before launch."}'::jsonb,
    'json',
    'Public privacy-page copy and publication status. Edited in Admin > Legal.',
    'immediate'
  ),
  (
    'legal.terms',
    'legal',
    '{"status":"coming_soon","title":"Terms and conditions","summary":"Our terms and conditions are being prepared for launch.","body":"The final terms will explain account responsibilities, generated-content rights, credits, refunds, acceptable use, third-party services, and account closure. Contact hello@beyondsocial.app with questions before launch."}'::jsonb,
    'json',
    'Public terms-page copy and publication status. Edited in Admin > Legal.',
    'immediate'
  )
on conflict (key) do nothing;
