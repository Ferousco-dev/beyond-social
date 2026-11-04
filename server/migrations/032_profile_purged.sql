-- When a deleted account's content was erased. A deleted account that has not been
-- purged yet is picked up again by the purge job, so a failed erase is retried.
alter table public.profiles add column purged_at timestamptz;
create index profiles_unpurged_idx on public.profiles (deleted_at) where deleted_at is not null and purged_at is null;
