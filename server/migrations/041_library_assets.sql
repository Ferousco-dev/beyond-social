-- Library assets: one file each, filed by what it is (face, voice, product,
-- environment, other) with a label the person chooses. Unlike asset groups,
-- nothing is bundled, so any face can be paired with any voice per video.
create table public.library_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('face', 'voice', 'product', 'environment', 'other')),
  label text not null check (char_length(label) between 1 and 60),
  media_id uuid not null,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Labels are how assets are picked later, so they are unique within a kind.
create unique index library_assets_label_idx on public.library_assets (user_id, kind, lower(label));
create index library_assets_user_idx on public.library_assets (user_id, kind, created_at desc);

alter table public.library_assets enable row level security;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute
      'alter table public.library_assets add constraint library_assets_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade';
    execute
      'create policy library_assets_select_own on public.library_assets for select to authenticated using (user_id = (select auth.uid()))';
  end if;
end
$$;

-- Every file already in a group becomes its own asset, labelled after the
-- group, with the group's consent carried over. Groups are left as they are.
insert into public.library_assets (user_id, kind, label, media_id, consent_at, created_at)
select g.user_id, slot.kind, left(g.name, 60), slot.media_id::uuid, slot.consent_at, g.created_at
from public.asset_groups g
cross join lateral (values
  ('face', g.face_id, g.face_consent_at),
  ('voice', g.voice_id, g.voice_consent_at),
  ('product', g.product_id, null::timestamptz),
  ('environment', g.environment_id, null::timestamptz)
) as slot (kind, media_id, consent_at)
where slot.media_id ~ '^[0-9a-f-]{36}$'
on conflict do nothing;

insert into public.library_assets (user_id, kind, label, media_id, created_at)
select g.user_id, 'other', left(coalesce(nullif(trim(extra ->> 'label'), ''), g.name), 60), (extra ->> 'id')::uuid, g.created_at
from public.asset_groups g
cross join lateral jsonb_array_elements(g.extras) as extra
where extra ->> 'id' ~ '^[0-9a-f-]{36}$'
on conflict do nothing;
