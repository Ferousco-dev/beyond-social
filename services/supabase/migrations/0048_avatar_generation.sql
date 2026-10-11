-- Talking avatars: a photo of a person plus an audio track, rendered as that
-- person speaking. The provider is the same as for video, so the task, callback
-- and ledger paths are the ones already in use.

-- 1. Audio in the uploads bucket.
--
-- The mime list is exactly what the provider accepts. WebM is deliberately
-- absent: it is what a browser MediaRecorder produces by default, and allowing
-- an upload the provider will later refuse turns a clear rejection at the door
-- into a failed render that has already been charged. Recording in the browser
-- needs a conversion step before that changes.
--
-- The existing 10MB limit is kept, because the provider caps audio at 10MB too.
update storage.buckets
set allowed_mime_types = allowed_mime_types || array[
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/mp4', 'audio/ogg'
]
where id = 'uploads';

-- 2. The model.
--
-- Avatar is its own family rather than being filed under video. Both produce a
-- video, but an avatar render needs a face and an audio track as input, so the
-- two cannot be offered interchangeably in a picker or priced off one rate.
alter table public.model_catalog drop constraint if exists model_catalog_family_check;
alter table public.model_catalog add constraint model_catalog_family_check
  check (family = any (array['video', 'image', 'chat', 'audio', 'avatar']));
--
-- Priced above veo3_fast because a render is longer and costs more upstream.
-- Inactive until the feature ships, so the gate refuses it rather than letting
-- a half-built path spend a credit.
insert into public.model_catalog
  (id, provider, name, family, description, capabilities, credit_cost, min_plan, is_active, sort_order)
values (
  'infinitalk/from-audio',
  'kie',
  'InfiniteTalk',
  'avatar',
  'Turns a photo and an audio track into that person speaking, with lip sync.',
  array['image-to-video', 'lip-sync', 'audio-driven', '720p', 'vertical'],
  2,
  'free',
  false,
  10
)
on conflict (id) do nothing;

-- 3. Consent.
--
-- Animating a face with a voice is the shape of a deepfake when the face is not
-- the uploader's. Every provider's terms require consent, and so does anywhere
-- this gets distributed, so an avatar render is refused without a recorded
-- acceptance rather than relying on a checkbox the client could skip.
--
-- One row per acceptance rather than a flag on the profile: the statement will
-- be reworded, and what matters later is which wording was agreed to and when.
create table if not exists public.likeness_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Bumped whenever the wording changes, which invalidates older acceptances.
  statement_version integer not null,
  accepted_at timestamptz not null default now()
);

create index if not exists likeness_consents_user_idx
  on public.likeness_consents (user_id, statement_version, accepted_at desc);

alter table public.likeness_consents enable row level security;

drop policy if exists "Users read own consents" on public.likeness_consents;
create policy "Users read own consents"
  on public.likeness_consents for select
  using (user_id = auth.uid());

drop policy if exists "Users record own consents" on public.likeness_consents;
create policy "Users record own consents"
  on public.likeness_consents for insert
  with check (user_id = auth.uid());

-- Deliberately no update or delete policy. An acceptance is a record of what
-- happened, so it is append only from the account holder's side.

comment on table public.likeness_consents is
  'Records that a user attested the face and voice they upload are their own. Append only.';
