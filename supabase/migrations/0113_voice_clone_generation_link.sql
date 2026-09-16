-- clone-voice charges a credit against a real video_generations row, the
-- same reserve-before-dispatch pattern every other generation type uses, but
-- nothing ever settles that row: poll-voice-clone only ever wrote to
-- voice_profiles.clone_status, because it had no way to find the
-- video_generations row a given clone attempt belonged to.
--
-- Consequence in production today: every voice clone leaves its
-- video_generations row stuck at 'queued' forever, invisible to
-- reconcile-generations (which only ever looks at 'generating'), and a clone
-- that fails at the provider after dispatch never refunds its credit, because
-- nothing calls fail_generation_by_id on a row it cannot identify.
--
-- One column closes the loop: clone-voice already knows the generation's id
-- the moment it creates it, so recording it here is what poll-voice-clone
-- needs to finish the job started for it.
alter table public.voice_profiles
  add column if not exists generation_id uuid references public.video_generations (id) on delete set null;

comment on column public.voice_profiles.generation_id is
  'The video_generations row clone-voice charged for this clone attempt. Set at dispatch, read by poll-voice-clone to settle that row (ready or refunded) once the clone resolves. Null once settled or if the attempt predates this column.';
