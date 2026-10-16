-- Voices cloned through ElevenLabs, owned per user. HeyGen-derived voices
-- stay on the avatars table; this table is provider-neutral by voice id.
create table public.cloned_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider_voice_id text not null,
  name text not null default '' check (char_length(name) <= 120),
  created_at timestamptz not null default now(),
  unique (user_id, provider_voice_id)
);

create index cloned_voices_user_idx on public.cloned_voices (user_id, created_at desc);

alter table public.cloned_voices enable row level security;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute
      'alter table public.cloned_voices add constraint cloned_voices_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade';
    execute
      'create policy cloned_voices_select_own on public.cloned_voices for select to authenticated using (user_id = (select auth.uid()))';
  end if;
end
$$;
