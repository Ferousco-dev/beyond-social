-- Report a revision conflict with a code the client can actually see.
--
-- 0021 raised SQLSTATE 40001 (serialization_failure). PostgREST treats that as a
-- transient serialisation problem rather than an application error: the request
-- dies at the transport level with no HTTP status and no body, so the caller
-- gets an unusable network error instead of "someone else saved first". The
-- write was correctly refused, but the client could not tell a conflict from an
-- outage.
--
-- PT409 is PostgREST's convention for "respond with this HTTP status", so the
-- conflict arrives as a real 409 with a readable message.
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

  if not exists (
    select 1 from public.projects where id = p_project and user_id = v_user
  ) then
    raise exception 'project not found';
  end if;

  select revision into v_current
    from public.editor_documents
   where project_id = p_project;

  -- Passing 0 forces the write, which is the "keep mine" branch of a conflict.
  if v_current is not null
     and p_expected_revision <> 0
     and v_current <> p_expected_revision then
    raise exception 'This project was saved somewhere else'
      using errcode = 'PT409',
            detail = format('stored revision %s, client had %s', v_current, p_expected_revision);
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
