-- The library is the user's finished videos, read from completed jobs. Removing
-- one hides it from the library without touching the job or what it cost.
alter table public.jobs add column library_hidden_at timestamptz;

create index jobs_library_idx on public.jobs (user_id, completed_at desc)
  where status = 'completed' and library_hidden_at is null and result ? 'video_url';
