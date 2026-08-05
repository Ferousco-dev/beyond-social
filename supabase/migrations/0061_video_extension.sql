-- Continuing a clip that already exists.
--
-- An extension is a generation in its own right: it costs a credit, it polls
-- the same way, and it produces its own file. What it is not is unrelated to
-- the clip it continues, and without a link there is no way to show the two
-- together or to stop someone extending the same eight seconds four times by
-- accident.
--
-- Self-referencing rather than a separate table because everything else about
-- the row is identical, and a second table would duplicate status, provider
-- task id, result path, and the whole polling path with it.
alter table public.video_generations
  add column if not exists extended_from uuid references public.video_generations (id) on delete set null;

-- The lookup is always "what continues this clip", never the reverse in bulk,
-- and it is only ever a handful of rows.
create index if not exists video_generations_extended_from_idx
  on public.video_generations (extended_from)
  where extended_from is not null;

comment on column public.video_generations.extended_from is
  'The generation this one continues. Null for an original clip. Set null on delete so an extension survives its source being removed.';

-- The thread also has to say which model made each draft.
--
-- Only some models can continue their own output, and the option is only worth
-- offering where it would work. Without the model on the row the interface has
-- to either hide continuation from everyone or offer it to everyone and let the
-- refusal explain itself, and neither is honest about what the product can do.
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
