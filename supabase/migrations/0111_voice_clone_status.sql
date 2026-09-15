-- Cloning a voice with HeyGen, tracked on the row 0050 already set aside for
-- it: `provider_voice_id` was added then and left null "until then", where
-- "then" is this migration.
--
-- Cloning is asynchronous at the provider (see poll-voice-clone), so the row
-- needs a state machine the way heygen_avatars.training_status already does
-- for twin training, not just a nullable id that is either set or is not.
-- 'none' is the default so every existing enrolled voice reads as never
-- attempted rather than as failed.
--
-- voice_clone_id is kept distinct from provider_voice_id because the id
-- HeyGen hands back from POST /v3/voices/clone is documented only as a
-- tracking id for the clone job; whether it is also the id later accepted by
-- POST /v3/voices/speech is unconfirmed (see poll-voice-clone.ts). Storing
-- both lets the poller write voice_clone_id immediately and provider_voice_id
-- only once a real GET /v3/voices/{id} response says the clone is usable, so
-- a generation can never reach for an id that was never confirmed ready.

alter table public.voice_profiles
  add column if not exists clone_status text not null default 'none'
    check (clone_status in ('none', 'pending', 'ready', 'failed')),
  add column if not exists clone_error text,
  add column if not exists voice_clone_id text,
  -- Mirrors heygen_avatars.poll_count: how many times poll-voice-clone has
  -- checked this row, and the stuck-safety cutoff it is compared against.
  add column if not exists poll_count integer not null default 0;

create index if not exists voice_profiles_clone_status_idx
  on public.voice_profiles (clone_status)
  where clone_status = 'pending';

comment on column public.voice_profiles.clone_status is
  'State of cloning this voiceprint with the speech provider: none (never attempted), pending (submitted, awaiting poll-voice-clone), ready (provider_voice_id usable), failed (see clone_error).';
comment on column public.voice_profiles.voice_clone_id is
  'The id HeyGen returned from POST /v3/voices/clone. May not be the same id POST /v3/voices/speech accepts; provider_voice_id is set separately once the poll confirms it.';
