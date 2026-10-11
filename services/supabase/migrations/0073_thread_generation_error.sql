-- Why a render failed, carried into the thread.
--
-- `fail_generation` has always written the provider's reason onto the row, and
-- nothing has ever read it. The draft turned grey and the assistant could only
-- say the video did not work, because that was genuinely all it knew: the one
-- place the reason existed was a column the thread never selected. Asking "why
-- did that fail" got a guess.
--
-- The same column is what a cancelled render carries, so the answer to "where
-- did that draft go" comes from here too.
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
  result_path text,
  generation_model text,
  generation_error text,
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
    g.result_path,
    g.model,
    g.error,
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
