-- The user's default model, per family.
--
-- One row per user per family, so choosing a video model cannot disturb the
-- image choice. The foreign key to `model_catalog` means a model that is
-- delisted takes its preferences with it rather than leaving rows pointing at
-- an id nothing can run.
--
-- Tier is deliberately not enforced here. A plan can be downgraded after a
-- preference is stored, and a constraint would then either block the downgrade
-- or silently rewrite a choice the user made legitimately. `can_run_model` is
-- still the authority at run time, so a stale preference is refused at the
-- moment it matters, which is the only moment that is safe to decide it.

create table if not exists public.user_model_preferences (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  family     text not null check (family in ('video', 'image', 'chat', 'audio')),
  model_id   text not null references public.model_catalog (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, family)
);

create index if not exists user_model_preferences_model_idx
  on public.user_model_preferences (model_id);

drop trigger if exists user_model_preferences_set_updated_at on public.user_model_preferences;
create trigger user_model_preferences_set_updated_at
  before update on public.user_model_preferences
  for each row execute function public.set_updated_at();

alter table public.user_model_preferences enable row level security;

drop policy if exists "Own model preferences" on public.user_model_preferences;
create policy "Own model preferences" on public.user_model_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.user_model_preferences is
  'The model each user prefers per family. Read by the generation path to pick a model; refused at run time by can_run_model if the plan no longer allows it.';
