-- Schema hygiene found by auditing the database rather than the migrations.
--
-- Three classes of problem, all of which only show up at size, which is why
-- they survived: on a database with a hundred rows every plan looks fine.

-- ---------------------------------------------------------------------------
-- 1. A duplicate index.
--
-- `video_generations_user_created_at_idx` (0014) and
-- `video_generations_user_created_idx` (0036) are byte-identical:
-- btree (user_id, created_at DESC). The second was added without checking for
-- the first. Two identical indexes double the write cost on every insert and
-- update to the hottest table in the product, and the planner can only ever use
-- one of them.
-- ---------------------------------------------------------------------------
drop index if exists public.video_generations_user_created_idx;

-- ---------------------------------------------------------------------------
-- 2. Foreign keys with no index.
--
-- Postgres does not index a foreign key for you. Without one, deleting a parent
-- row sequentially scans the child table to enforce the constraint, and any
-- join or filter on that column does the same. Deleting one project would scan
-- every message embedding in the system.
--
-- Only the columns on tables that grow are covered here. The rest
-- (app_config.updated_by, feature_flags.updated_by, managed_secrets.rotated_by,
-- profiles.deleted_by, organizations.created_by) sit on small tables where a
-- sequential scan is cheaper than an index, and adding one would be cargo cult.
-- ---------------------------------------------------------------------------
create index if not exists messages_generation_id_idx
  on public.messages (generation_id)
  where generation_id is not null;

create index if not exists message_embeddings_project_idx
  on public.message_embeddings (project_id);

create index if not exists credit_ledger_generation_idx
  on public.credit_ledger (generation_id)
  where generation_id is not null;

create index if not exists scheduled_posts_generation_idx
  on public.scheduled_posts (generation_id)
  where generation_id is not null;

create index if not exists user_memories_source_project_idx
  on public.user_memories (source_project)
  where source_project is not null;

-- ---------------------------------------------------------------------------
-- 3. An RLS policy with nothing to stand on.
--
-- `conversation_summaries` is filtered by `auth.uid() = user_id` on every read
-- and had no index on user_id, so the policy forced a sequential scan of every
-- summary in the system to return one user's row. The table is small today and
-- grows with every long conversation.
--
-- This is the case where the usual advice about wrapping auth.uid() in a
-- subselect actually matters. Where an index exists, Postgres folds the call
-- into an index condition and evaluates it once; where one does not, it is
-- called per row on top of the scan.
-- ---------------------------------------------------------------------------
create index if not exists conversation_summaries_user_idx
  on public.conversation_summaries (user_id);
