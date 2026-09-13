-- Status changes reach the browser without a poll.
--
-- A finished render lands through `kie-callback`, minutes after the turn that
-- asked for it. Until now the only way a client learned of that was its own
-- 3-second poll (`use-generation-poll.ts`), which stops the moment the tab
-- closes and starts over on every reload. Supabase Realtime has been in the
-- stack the whole time; nothing subscribed to it.
--
-- Adding the table to the publication is the whole server-side change. What a
-- subscriber receives is filtered by row level security, and the only RLS
-- policy on this table is `Owners read their generations`, so each session
-- hears only its own rows: the database enforces the scoping, not a payload
-- filter the client could get wrong.
--
-- Only UPDATE is wanted. INSERT and DELETE stay out of the broadcast: a row is
-- born `queued` attached to a message the client already rendered optimistically,
-- and it is never deleted (retention explicitly preserves generations), so
-- broadcasting either would send events that describe nothing the interface
-- needs.
--
-- `alter publication` is not transactional on hosted Supabase: it commits
-- outside the migration's transaction. Applied through `supabase db push` this
-- is invisible; if it ever runs inside a wrapped transaction it must be the
-- statement after the last BEGIN/COMMIT boundary.
alter publication supabase_realtime add table public.video_generations;

comment on publication supabase_realtime is
  'Realtime broadcast. video_generations sends UPDATE only; delivery is RLS-scoped to the owner.';
