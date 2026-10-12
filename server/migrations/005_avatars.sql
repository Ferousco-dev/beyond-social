-- HeyGen digital twins and the phone handoff used to record them.
create table public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null default 'My avatar' check (char_length(btrim(name)) between 1 and 60),
  is_default boolean not null default false,
  training_status text not null default 'pending' check (training_status in ('pending', 'ready', 'failed')),

  -- The source recording. It is deleted once training reaches a final state.
  storage_path text,
  footage_deleted_at timestamptz,

  -- The attestation made when the recording was submitted.
  consent_version integer not null,
  consent_at timestamptz not null default now(),
  consent_reroute_url text,
  idempotency_key text,

  -- HeyGen's identifiers, kept distinct from our own id. provider_avatar_id is
  -- the character, provider_look_id the appearance a video is made from.
  provider_avatar_id text,
  provider_look_id text,
  provider_voice_id text,   -- the voice HeyGen cloned from the recording
  selected_voice_id text,   -- the voice this avatar speaks with
  provider_consent_status text,
  provider_consent_url text,
  provider_consent_url_expires_at timestamptz,
  provider_preview_image_url text,
  provider_preview_video_url text,
  provider_error text,

  -- Set before HeyGen is asked to train, never moved: the replay window for the
  -- idempotent resubmission runs from the first attempt.
  submit_started_at timestamptz,
  poll_count integer not null default 0 check (poll_count >= 0),
  next_run_at timestamptz,
  trained_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index avatars_one_default_idx on public.avatars (user_id) where is_default;
create index avatars_user_recent_idx on public.avatars (user_id, created_at desc);
create index avatars_due_idx on public.avatars (next_run_at) where next_run_at is not null;
create unique index avatars_user_idempotency_idx on public.avatars (user_id, idempotency_key) where idempotency_key is not null;
create unique index avatars_provider_group_idx on public.avatars (provider_avatar_id) where provider_avatar_id is not null;

create trigger avatars_set_updated_at
  before update on public.avatars
  for each row execute function public.set_updated_at();

-- At most five avatars per user, enforced here so two concurrent requests
-- cannot both slip under the limit.
create function public.enforce_avatar_limit()
returns trigger
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.avatars where user_id = new.user_id) >= 5 then
    raise exception using errcode = '23514', message = 'avatar_limit_reached';
  end if;
  return new;
end;
$$;

create trigger avatars_limit
  before insert on public.avatars
  for each row execute function public.enforce_avatar_limit();

-- A phone that scans a QR code holds one of these tokens instead of a session.
-- Only the token's SHA-256 is stored.
create table public.avatar_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  storage_path text,
  created_at timestamptz not null default now()
);

create index avatar_handoffs_user_idx on public.avatar_handoffs (user_id, created_at desc);
