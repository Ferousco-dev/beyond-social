-- An enrolled voice.
--
-- Distinct from importing a clip in the composer, which is transient input used
-- for one render and kept as nothing. This is a stored voiceprint the user
-- chooses to keep and reuse, which makes it biometric data: special category
-- under GDPR, and covered by state biometric statutes that require consent and
-- a retention story. So it is opt in, never required to use the feature, and
-- deletable by the person it belongs to.
--
-- One per user. "My voice" is singular in the product, and a unique constraint
-- makes replacing it obvious: re-enrolling overwrites rather than accumulating
-- recordings nobody can tell apart.

create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,

  -- The enrolled clip, in the uploads bucket under the owner's own prefix.
  storage_path text not null,

  -- What the user was asked to read. Kept because verification compared the
  -- recording against this exact wording, and a later dispute is unanswerable
  -- without knowing which phrase was used.
  phrase text not null,

  -- Consent to store a voiceprint, versioned separately from the likeness
  -- consent: agreeing that a face is yours is not agreeing to keep a copy of
  -- your voice, and conflating them would make both unprovable.
  consent_version integer not null,

  -- Set once the clip has been cloned with the speech provider, which is what
  -- lets the voice say something it never recorded. Null until then, so an
  -- enrolled voice is usable as a plain clip in the meantime.
  provider_voice_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_profiles enable row level security;

drop policy if exists "Users read own voice" on public.voice_profiles;
create policy "Users read own voice"
  on public.voice_profiles for select
  using (user_id = auth.uid());

drop policy if exists "Users enrol own voice" on public.voice_profiles;
create policy "Users enrol own voice"
  on public.voice_profiles for insert
  with check (user_id = auth.uid());

drop policy if exists "Users replace own voice" on public.voice_profiles;
create policy "Users replace own voice"
  on public.voice_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Unlike a consent record, which is a fact about the past and stays, a
-- voiceprint is the data itself. Deleting it has to be something the person can
-- do, and do without asking anyone.
drop policy if exists "Users delete own voice" on public.voice_profiles;
create policy "Users delete own voice"
  on public.voice_profiles for delete
  using (user_id = auth.uid());

-- Deleting the row does not remove the object it points at: storage lives
-- outside the database and a trigger cannot reach it. The action that deletes a
-- profile removes the object first, and account deletion already clears the
-- user's whole prefix.
comment on table public.voice_profiles is
  'An opt-in enrolled voice. Biometric data: deletable by its owner, and the stored object must be removed alongside the row.';
