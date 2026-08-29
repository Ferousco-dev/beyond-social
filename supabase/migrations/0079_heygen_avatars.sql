-- A trained HeyGen digital twin: one per user.
--
-- Distinct from brand_assets (kind 'avatar') and voice_profiles: those each
-- hold one plain storage object with a simple consent flag, reused as-is on
-- every render. This holds the source recording that trained a provider-side
-- asset, the provider's own id for it, and a training lifecycle neither of
-- those tables has any reason to carry. See docs/live-avatar/DESIGN.md for
-- the full design; this is build-order step 1 from that document.
--
-- No provider call happens yet. This migration only makes the row shape
-- exist so the recording flow (step 3) has somewhere to write to.

create table if not exists public.heygen_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,

  -- The training recording, in the uploads bucket under the owner's own
  -- prefix, same convention as every other asset. Kept for the same reason
  -- voice_profiles keeps its clip: a later dispute needs the source, not
  -- just the provider's derived asset.
  storage_path text not null,

  -- The provider's own identifier for the trained avatar. Null while
  -- training is in progress, since Avatar V training is not instant; the
  -- row exists before this is known so the UI has something to poll.
  provider_avatar_id text,
  training_status text not null default 'pending'
    check (training_status in ('pending', 'ready', 'failed')),

  -- Consent to a HeyGen-specific statement: training a persistent, reusable
  -- digital twin is a materially bigger promise than likeness_consents'
  -- general "a video was made from this photo" wording, so it is recorded
  -- separately rather than reusing that table's version counter.
  consent_version integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists heygen_avatars_status_idx
  on public.heygen_avatars (training_status)
  where training_status = 'pending';

drop trigger if exists heygen_avatars_set_updated_at on public.heygen_avatars;
create trigger heygen_avatars_set_updated_at
  before update on public.heygen_avatars
  for each row execute function public.set_updated_at();

alter table public.heygen_avatars enable row level security;

drop policy if exists "Users read own heygen avatar" on public.heygen_avatars;
create policy "Users read own heygen avatar"
  on public.heygen_avatars for select
  using (user_id = auth.uid());

drop policy if exists "Users create own heygen avatar" on public.heygen_avatars;
create policy "Users create own heygen avatar"
  on public.heygen_avatars for insert
  with check (user_id = auth.uid());

-- Row updates (training_status, provider_avatar_id) are written by the
-- service role once the provider responds, the same reason video_generations
-- rows are only ever transitioned by admin/service code rather than the
-- client claiming its own render finished.
drop policy if exists "Users update own heygen avatar" on public.heygen_avatars;
create policy "Users update own heygen avatar"
  on public.heygen_avatars for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Deleting is the user's alone, same as voice_profiles: this is their
-- likeness, not a record of something that happened, and no one's approval
-- stands between them and removing it.
drop policy if exists "Users delete own heygen avatar" on public.heygen_avatars;
create policy "Users delete own heygen avatar"
  on public.heygen_avatars for delete
  using (user_id = auth.uid());

comment on table public.heygen_avatars is
  'A HeyGen-trained digital twin, one per user, opt-in and owner-deletable. Deleting a row does not by itself remove the storage object or the provider-side asset; the action that deletes must do both.';
