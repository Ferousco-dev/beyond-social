-- A normalized category alongside the free-text failure reason.
--
-- `video_generations.error` has always held whatever string a failure path
-- decided to write, and until now that included the provider's own wording
-- passed straight through: `kie-callback`'s failure branch wrote `body.msg`
-- onto the row unfiltered, which is kie's own phrasing reaching the thread a
-- customer reads. `_shared/kie-errors.ts` gained a real classifier
-- (`classifyFailure`) for this reason, sorting every failure into one of a
-- small, closed set of categories with a safe message attached, and every
-- failure path (dispatch, callback, poll, reconcile) now goes through it.
--
-- `error_code` is where that category lands: plain text rather than an enum,
-- because the set of categories is application logic in `kie-errors.ts`, not
-- a database invariant, and a new category should not need a migration to
-- add. Nullable, and left null by every existing row, since none of them was
-- ever classified.
alter table public.video_generations
  add column if not exists error_code text;

comment on column public.video_generations.error_code is
  'One of ErrorCategory from supabase/functions/_shared/kie-errors.ts. Null for rows that failed before this existed, or that never failed.';

-- Same signature, plus the category, added last and defaulted so every
-- existing caller keeps working unchanged. Dropped and recreated rather than
-- `create or replace`, the same way migration 0090 did for these two:
-- Postgres treats a new parameter list as a different overload, not a
-- replacement, so `create or replace` would leave the two-argument versions
-- in place alongside these rather than retiring them.
drop function if exists public.fail_generation_by_id(uuid, text);
drop function if exists public.fail_generation(text, text);

create function public.fail_generation_by_id(
  p_generation uuid,
  p_error text,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_gen public.video_generations;
  v_debit integer;
begin
  select * into v_gen from public.video_generations
    where id = p_generation for update;

  if not found or v_gen.status not in ('queued', 'generating') then
    return false;
  end if;

  update public.video_generations
    set status = 'failed', error = p_error, error_code = p_error_code
    where id = v_gen.id;

  select sum(delta) into v_debit from public.credit_ledger
    where generation_id = v_gen.id and kind = 'debit';

  if coalesce(v_debit, 0) < 0 then
    insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
    values (v_gen.user_id, -v_debit, 'video_generation_refund', v_gen.id, 'refund',
            'refund:' || v_gen.id)
    on conflict (external_ref) where external_ref is not null do nothing;
  end if;

  return true;
end; $$;

create function public.fail_generation(
  p_provider_task_id text,
  p_error text,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.video_generations
    where provider_task_id = p_provider_task_id;
  if v_id is null then
    return false;
  end if;

  return public.fail_generation_by_id(v_id, p_error, p_error_code);
end; $$;

revoke all on function public.fail_generation_by_id(uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_generation(text, text, text) from public, anon, authenticated;
grant execute on function public.fail_generation_by_id(uuid, text, text) to service_role;
grant execute on function public.fail_generation(text, text, text) to service_role;

comment on function public.fail_generation_by_id(uuid, text, text) is
  'Settles a queued or generating run as failed and refunds whatever it was charged. Returns true only when it actually transitioned, so callers can tell a real failure from a no-op.';
comment on function public.fail_generation(text, text, text) is
  'Settles a run as failed by provider task id. Returns true only when it actually transitioned.';

-- The thread already reads the failure reason (migration 0073); it reads the
-- category alongside it now, so a client can tell "try again" apart from
-- "fix your input" without parsing the sentence.
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
  generation_error_code text,
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
    g.error_code,
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
