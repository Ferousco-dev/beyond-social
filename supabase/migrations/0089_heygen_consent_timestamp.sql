-- When consent was given, as a fact rather than an inference.
--
-- The row recorded which version of the statement was accepted and left `when`
-- to be inferred from `created_at`. Those are the same value only until the row
-- is rewritten, and it is rewritten on every re-record: somebody who recorded in
-- March and again in September would have a September consent date for a March
-- attestation, which is the one thing a consent record exists to be exact about.
--
-- BIPA's retention obligation is expressed relative to the last interaction, and
-- GDPR's explicit-consent basis has to be demonstrable, so this is the column
-- both of those questions are actually asked of.

alter table public.heygen_avatars
  add column if not exists consent_at timestamptz;

-- Existing rows: the recording is the consent, and it was made when the row was,
-- so backfilling from created_at is accurate for every row that exists today.
update public.heygen_avatars set consent_at = created_at where consent_at is null;

comment on column public.heygen_avatars.consent_at is
  'When the consent statement was read and recorded. Set on every training run, not only the first.';
