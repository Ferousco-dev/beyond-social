-- Pictures a user keeps: their own face, and the things they sell.
--
-- Distinct from `assets`, which records what fed one generation and is history.
-- This is a small curated library the user chooses to keep and reuse, so
-- attaching yourself to a video is picking from a shelf rather than finding the
-- same photo on your phone every time.
--
-- The two kinds are one table because they are the same object with different
-- consent stories, and splitting them would duplicate the storage handling to
-- express that. What separates them is enforced below: an avatar is a likeness
-- and carries an attestation, a product does not and must not pretend to.

create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  kind text not null check (kind in ('avatar', 'product')),

  -- In the uploads bucket, under the owner's own prefix, same as every other
  -- image the user sends.
  storage_path text not null,

  -- What the user calls it. Empty for an avatar, which needs no name: there is
  -- only ever one and it is them.
  label text not null default '',

  -- Consent to keep and reuse a likeness, versioned the same way the voiceprint
  -- is. Null for a product, and required for an avatar by the constraint below:
  -- a face stored for reuse is a different promise from one sent once for a
  -- single render, and the record has to show which was agreed to.
  consent_version integer,

  created_at timestamptz not null default now(),

  constraint brand_assets_avatar_needs_consent
    check (kind <> 'avatar' or consent_version is not null)
);

-- One avatar per user. "Me" is singular in the product, and a unique index makes
-- replacing it obvious: re-uploading overwrites rather than accumulating photos
-- nobody can tell apart. Products are deliberately uncapped here; a catalogue is
-- a real thing to have.
create unique index if not exists brand_assets_one_avatar_idx
  on public.brand_assets (user_id)
  where kind = 'avatar';

create index if not exists brand_assets_owner_idx
  on public.brand_assets (user_id, kind, created_at desc);

alter table public.brand_assets enable row level security;

drop policy if exists "Users read own brand assets" on public.brand_assets;
create policy "Users read own brand assets"
  on public.brand_assets for select
  using (user_id = auth.uid());

drop policy if exists "Users add own brand assets" on public.brand_assets;
create policy "Users add own brand assets"
  on public.brand_assets for insert
  with check (user_id = auth.uid());

drop policy if exists "Users update own brand assets" on public.brand_assets;
create policy "Users update own brand assets"
  on public.brand_assets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Deleting is the user's alone, and needs no one's approval. This is their face
-- and their products, not a record of something that happened.
drop policy if exists "Users delete own brand assets" on public.brand_assets;
create policy "Users delete own brand assets"
  on public.brand_assets for delete
  using (user_id = auth.uid());

comment on table public.brand_assets is
  'Reusable pictures: one avatar per user, and any number of product shots. Deleting a row does not remove the storage object; the action that deletes does that first.';
