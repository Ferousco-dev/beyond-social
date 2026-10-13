-- A finished video copied into our storage remembers which job made it, so
-- asking again returns the same copy instead of storing the video twice.
alter table public.media add column source_job_id uuid;
create unique index media_source_job_idx on public.media (user_id, source_job_id) where source_job_id is not null;
