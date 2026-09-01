-- HeyGen returns two identifiers for one trained twin, and the row only had
-- somewhere to put one.
--
-- The group is the character: consent is registered against it, training status
-- is read from it, and it outlives any particular appearance. The look is one
-- appearance of that character, and is what a video generation actually names.
-- `provider_avatar_id` holds the group, because that is the durable identity;
-- the look gets its own column rather than being squeezed into the same one and
-- guessed at later.
--
-- Also gives a failed training somewhere to say why. `training_status` could
-- already be 'failed' with no room for the reason, which turns a fixable
-- complaint about the footage into an unexplained dead end.

alter table public.heygen_avatars
  add column if not exists provider_look_id text,
  add column if not exists provider_error text,
  -- HeyGen refuses to generate from a private avatar until consent is
  -- registered on its side, separately from our own attestation, so whether
  -- that has happened is a fact about the row and not something to re-derive.
  add column if not exists provider_consent_status text;

comment on column public.heygen_avatars.provider_avatar_id is
  'HeyGen avatar group id: the character, which consent and training status hang off.';
comment on column public.heygen_avatars.provider_look_id is
  'HeyGen avatar look id: the appearance a video generation names.';
