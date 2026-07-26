-- Editor documents.
--
-- The timeline lived entirely in React state, so every trim, caption and music
-- choice was lost on refresh. The chat and its generations persist; the edit on
-- top of them did not, which made the editor a demo of itself.
--
-- Stored as one JSONB document rather than normalised tracks and items. The
-- editor already treats the project as a single value it snapshots for undo, and
-- nothing queries inside it: it is read whole and written whole. Normalising
-- would add joins and migrations for no query we actually run.

create table if not exists public.editor_documents (
  -- One document per project, so the project id is the key.
  project_id uuid primary key references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  document   jsonb not null,
  -- Bumped on every save. A second tab that has fallen behind can notice rather
  -- than silently overwriting newer work.
  revision   bigint not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists editor_documents_user_idx
  on public.editor_documents (user_id, updated_at desc);

alter table public.editor_documents enable row level security;

-- The owner may read and write their own document. Unlike the token table there
-- is nothing secret here: it is the user's own edit, and the client is the thing
-- editing it.
create policy "editor_documents_select_own" on public.editor_documents
  for select using (auth.uid() = user_id);

create policy "editor_documents_insert_own" on public.editor_documents
  for insert with check (auth.uid() = user_id);

create policy "editor_documents_update_own" on public.editor_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

/*
 * Saves a document and returns the new revision.
 *
 * The revision check is what stops a stale tab clobbering newer work: a client
 * sends the revision it loaded, and a mismatch is refused rather than applied.
 * Passing 0 forces the write, which is the "keep mine" branch of that conflict.
 */
create or replace function public.editor_document_save(
  p_project uuid,
  p_document jsonb,
  p_expected_revision bigint default 0
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_current bigint;
  v_next bigint;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Scoped to a project the caller owns. RLS enforces this as well; failing
  -- here first gives a clearer error than a policy violation.
  if not exists (
    select 1 from public.projects where id = p_project and user_id = v_user
  ) then
    raise exception 'project not found';
  end if;

  select revision into v_current
    from public.editor_documents
   where project_id = p_project;

  if v_current is not null
     and p_expected_revision <> 0
     and v_current <> p_expected_revision then
    raise exception 'revision conflict: stored %, expected %', v_current, p_expected_revision
      using errcode = '40001';
  end if;

  insert into public.editor_documents (project_id, user_id, document, revision, updated_at)
  values (p_project, v_user, p_document, 1, now())
  on conflict (project_id) do update
    set document = excluded.document,
        revision = public.editor_documents.revision + 1,
        updated_at = now()
  returning revision into v_next;

  return v_next;
end;
$$;

grant execute on function public.editor_document_save(uuid, jsonb, bigint) to authenticated;
