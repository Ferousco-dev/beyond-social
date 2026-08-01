-- What was attached to a message.
--
-- Photos and voice clips were recorded against the generation they fed, and
-- nowhere else. That is the right home for a render input but the wrong one for
-- a conversation: a turn that attached three photos and asked a question
-- started no generation at all, so on reload the thread showed the question
-- with no sign of the photos. Attachments belong to the message, which is what
-- this records.
--
-- The object path is stored, never a URL. Uploads live in a private bucket and
-- are read through signed links that expire in two hours, so a stored URL is a
-- link that works for the rest of the session and is broken by morning. The
-- path is durable and re-signing on read is cheap.
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  -- The same vocabulary as `assets`, because these describe the same objects in
  -- the same bucket. A second enum would be two lists to keep in step.
  kind public.asset_kind not null,
  -- Narrowed to what the composer can actually attach. `asset_kind` also has
  -- 'video', but user video lives in the `video-uploads` bucket rather than
  -- `uploads`, and this table records a path with no bucket beside it: a video
  -- row would be signed against the wrong bucket and render as a broken link.
  -- Widening this means adding a bucket column first, so it is refused here
  -- rather than stored and quietly failing on read.
  constraint message_attachments_kind_check check (kind in ('photo', 'audio')),
  storage_path text not null,
  -- Attachment order is meaningful: the first photo is the one an avatar render
  -- uses as its face, so it cannot be left to whatever order a select returns.
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- The thread reads every attachment for a message at once, in order.
create index if not exists message_attachments_message_idx
  on public.message_attachments (message_id, sort_order);

alter table public.message_attachments enable row level security;

-- Ownership is derived from the message rather than copied onto the row. A
-- denormalised user_id would be a second thing to keep true, and it can drift;
-- the message already has one and it is the authority.
create policy "Owners read their message attachments"
  on public.message_attachments for select
  using (
    exists (
      select 1 from public.messages m
       where m.id = message_id and m.user_id = auth.uid()
    )
  );

-- `append_turn` runs as the invoker, like every other function here, so the
-- write is policied rather than trusted. The same ownership test as the read:
-- an attachment can only ever be hung off a message the caller owns.
create policy "Active owners write their message attachments"
  on public.message_attachments for insert
  with check (
    exists (
      select 1 from public.messages m
       where m.id = message_id and m.user_id = auth.uid()
    )
    and not is_suspended()
  );

-- No update policy. An attachment is a record of what was sent, and editing
-- that after the fact would make the thread disagree with what happened.
create policy "Owners delete their message attachments"
  on public.message_attachments for delete
  using (
    exists (
      select 1 from public.messages m
       where m.id = message_id and m.user_id = auth.uid()
    )
  );

/*
 * Appends a turn, with whatever the user attached to it.
 *
 * The four-argument version is dropped rather than left alongside this one:
 * PostgREST resolves an RPC by name, and two overloads that differ only by a
 * defaulted argument make every call ambiguous.
 */
drop function if exists public.append_turn(uuid, text, text, uuid);

create or replace function public.append_turn(
  p_project uuid,
  p_user_content text,
  p_assistant_content text,
  p_generation uuid default null,
  p_attachments jsonb default '[]'::jsonb
)
returns setof public.messages
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  -- The turn's message ids, user first. Ordered on the way in so the
  -- attachment insert below does not have to re-derive which row is which.
  v_ids uuid[];
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
  with inserted as (
    insert into public.messages (project_id, user_id, role, content, generation_id)
    values
      (p_project, v_user, 'user', p_user_content, null),
      (p_project, v_user, 'assistant', p_assistant_content, p_generation)
    returning id, role
  ),
  -- A data-modifying CTE always runs to completion whether or not the outer
  -- query reads it, which is what keeps the timestamp bump in one statement.
  touched as (
    update public.projects set updated_at = now() where id = p_project
    returning 1
  )
  select array_agg(id order by case role when 'user' then 0 else 1 end)
    into v_ids
    from inserted;

  -- Deliberately a separate statement. The insert policy proves ownership by
  -- looking the message up, and a row inserted in the same statement is not
  -- visible to that lookup: every CTE reads the snapshot from before the
  -- statement began. Writing the attachments afterwards is what lets the
  -- function stay `security invoker` and be policied like everything else,
  -- rather than escalating to definer to work around its own RLS.
  --
  -- Atomicity is unaffected: a function body is one transaction either way.
  insert into public.message_attachments (message_id, kind, storage_path, sort_order)
  select
    v_ids[1],
    (item->>'kind')::public.asset_kind,
    item->>'path',
    ordinality - 1
  from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb))
    with ordinality as elements(item, ordinality)
  -- A path outside the caller's own prefix is refused rather than stored. The
  -- bucket policy already scopes writes this way, and this keeps a hand-made
  -- request from pointing a thread at an object it does not own.
  where item->>'path' like v_user::text || '/%';

  return query
  select * from public.messages
   where id = any(v_ids)
   order by case role when 'user' then 0 else 1 end;
end;
$$;

grant execute on function public.append_turn(uuid, text, text, uuid, jsonb) to authenticated;

/*
 * A thread with each message's generation and attachments resolved.
 *
 * The return type gains a column, so the old function is dropped rather than
 * replaced: `create or replace` cannot change a function's output columns.
 */
drop function if exists public.project_thread(uuid);

create or replace function public.project_thread(p_project uuid)
returns table (
  id uuid,
  role public.message_role,
  content text,
  created_at timestamptz,
  generation_id uuid,
  generation_status public.generation_status,
  result_url text,
  attachments jsonb
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
    g.result_url,
    -- Aggregated here rather than in a second query, so a thread stays one
    -- round trip however many photos it carries. Empty array, never null: the
    -- reader should not have to treat "no attachments" as a separate case.
    coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('kind', a.kind, 'path', a.storage_path)
                 order by a.sort_order
               )
          from public.message_attachments a
         where a.message_id = m.id
      ),
      '[]'::jsonb
    ) as attachments
  from public.messages m
  left join public.video_generations g on g.id = m.generation_id
  where m.project_id = p_project
  order by m.created_at, case m.role when 'user' then 0 else 1 end;
$$;

grant execute on function public.project_thread(uuid) to authenticated;
