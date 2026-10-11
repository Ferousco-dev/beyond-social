-- Whether an uploaded photo shows a person.
--
-- The likeness attestation only makes sense for uploads of people. Most photos
-- are products, food, places and screenshots, and asking someone to swear a
-- consent statement over a picture of a shoe is worse than useless: it teaches
-- people to dismiss the dialog, which is the one place the wording has to
-- actually be read.
--
-- So the gate is conditional and this is the condition, decided once when the
-- file is uploaded rather than on every send.
--
-- Null means not yet classified, which is treated as a person by every reader.
-- The cost of being wrong is asymmetric: a needless dialog over a photo of a
-- shoe is an annoyance, a missed one means a real face was animated with no
-- attestation recorded at all.
alter table public.assets
  add column if not exists contains_person boolean;

comment on column public.assets.contains_person is
  'Vision classification of the upload. Null means unknown, which readers must treat as true.';

-- The send path asks "does any of these paths show a person" for a handful of
-- paths belonging to one user, so the lookup is by owner and path.
create index if not exists assets_user_path_idx
  on public.assets (user_id, storage_path);
