-- Link a message to the generation it produced.
--
-- The conversation tables have existed since 0002 but nothing wrote to them:
-- the chat kept its thread in React state, so a refresh lost the entire
-- conversation. Persisting it needs one thing the schema was missing, which is a
-- way for an assistant message to point at the video it made. Without that link
-- a reloaded thread can show what was said but not what was produced.
--
-- Nullable, because most assistant messages are just text.
alter table public.messages
  add column if not exists generation_id uuid
    references public.video_generations (id) on delete set null;

-- Assets already carry project_id; this is the lookup the composer needs when
-- rebuilding which photos belong to a thread.
create index if not exists assets_project_idx
  on public.assets (project_id, created_at desc);

/*
 * Appends a turn and returns the stored rows.
 *
 * One function rather than two inserts from the client: a user message with no
 * assistant message is a thread that looks broken, and doing both in a single
 * statement means they either both land or neither does. It also bumps the
 * project's updated_at, which is what orders the sidebar.
 */
create or replace function public.append_turn(
  p_project uuid,
  p_user_content text,
  p_assistant_content text,
  p_generation uuid default null
)
returns setof public.messages
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- The insert is scoped to a project the caller owns. RLS on messages enforces
  -- this too; failing here first gives a clearer error than a policy violation.
  if not exists (
    select 1 from public.projects
     where id = p_project and user_id = v_user
  ) then
    raise exception 'project not found';
  end if;

  -- Both rows share a created_at because now() is fixed for the statement, so
  -- the turn is ordered explicitly rather than by timestamp or by enum order.
  return query
  with inserted as (
    insert into public.messages (project_id, user_id, role, content, generation_id)
    values
      (p_project, v_user, 'user', p_user_content, null),
      (p_project, v_user, 'assistant', p_assistant_content, p_generation)
    returning *
  ),
  -- A data-modifying CTE always runs to completion whether or not the outer
  -- query reads it, which is what keeps the timestamp bump in one statement.
  touched as (
    update public.projects set updated_at = now() where id = p_project
    returning 1
  )
  select * from inserted
   order by case role when 'user' then 0 else 1 end;
end;
$$;

grant execute on function public.append_turn(uuid, text, text, uuid) to authenticated;

/*
 * A thread with each message's generation resolved.
 *
 * Joined in the database rather than the client so one round trip returns
 * everything the screen renders, instead of one query per message.
 */
create or replace function public.project_thread(p_project uuid)
returns table (
  id uuid,
  role public.message_role,
  content text,
  created_at timestamptz,
  generation_id uuid,
  generation_status public.generation_status,
  result_url text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id,
    m.role,
    m.content,
    m.created_at,
    m.generation_id,
    g.status,
    g.result_url
  from public.messages m
  left join public.video_generations g on g.id = m.generation_id
  where m.project_id = p_project
  order by m.created_at, case m.role when 'user' then 0 else 1 end;
$$;

grant execute on function public.project_thread(uuid) to authenticated;
