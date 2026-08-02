-- Finished videos stop being world-readable.
--
-- The `renders` bucket was public, so every URL of the form
-- /storage/v1/object/public/renders/<user>/<task>.mp4 served the video to
-- anyone who had it, with no session and no check. The ids are UUIDs so they
-- are not guessable, but unlisted is not private, and on a product where people
-- upload their own face and voice that distinction is the whole point.
--
-- `uploads` and `video-uploads` were already private. This makes the one that
-- holds the finished result match them.
update storage.buckets set public = false where id = 'renders';

-- Reads are now policied, the same way the uploads bucket already is: the first
-- path segment is the owner's id.
create policy "Users read own renders"
  on storage.objects for select
  using (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Writes stay with the service role only. Renders are produced by the callback
-- and the worker, never by a client, so there is deliberately no insert policy:
-- a client that could write here could put anything under someone's prefix and
-- have it served back as their video.

/*
 * The object path, alongside the URL.
 *
 * `result_url` holds a fully-qualified public URL, which stops resolving the
 * moment the bucket goes private. The path is the durable fact and the URL is
 * derived from it, exactly as it is for message attachments: a signed URL is
 * something you mint when asked, not something you store.
 *
 * `result_url` is kept rather than dropped. It is part of the published API
 * contract in /api/v1/generations and in the OpenAPI document, so removing the
 * column would break callers; it is now filled with a signed URL at read time
 * instead of a permanent public one.
 */
alter table public.video_generations
  add column if not exists result_path text;

-- Backfills from the URLs already stored. Everything after `/renders/` is the
-- object path, which is what the public URL was built from in the first place.
update public.video_generations
   set result_path = split_part(result_url, '/object/public/renders/', 2)
 where result_url like '%/object/public/renders/%'
   and result_path is null;

comment on column public.video_generations.result_path is
  'Object path in the private `renders` bucket. Sign it on read; never store the signed URL.';

/*
 * Completion records the path as well as the URL.
 *
 * Derived here rather than passed in, so the callback and the poller both get
 * it without changing their signatures. `split_part` yields an empty string
 * when the separator is absent, which is the case whenever `persistRender`
 * fell back to the provider's own URL because our upload failed; that is
 * nulled rather than stored, because an empty path is not a path.
 */
create or replace function public.complete_generation(
  p_provider_task_id text,
  p_result_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gen public.video_generations;
  v_cost integer;
  v_path text;
begin
  select * into v_gen from public.video_generations
    where provider_task_id = p_provider_task_id for update;

  if not found or v_gen.status in ('ready', 'cancelled') then
    return;
  end if;

  v_path := nullif(split_part(p_result_url, '/object/public/renders/', 2), '');
  if v_path is null then
    v_path := nullif(split_part(p_result_url, '/object/sign/renders/', 2), '');
  end if;

  update public.video_generations
    set status = 'ready', result_url = p_result_url, result_path = v_path, error = null
    where id = v_gen.id;

  -- An unlisted model still ran and still costs us money, so it falls back to
  -- the base rate rather than to free.
  select coalesce(max(credit_cost), 1) into v_cost
    from public.model_catalog where id = v_gen.model;

  if v_cost > 0 then
    insert into public.credit_ledger (user_id, delta, reason, generation_id, kind, external_ref)
    values (v_gen.user_id, -v_cost, 'video_generation', v_gen.id, 'debit',
            'generation:' || v_gen.id)
    on conflict (external_ref) where external_ref is not null do nothing;
  end if;
end;
$$;

/*
 * The thread carries the render's path as well as its URL.
 *
 * The URL is left in place so nothing that still reads it breaks mid-deploy,
 * but the path is what the app signs. Return type changes, so the function is
 * dropped rather than replaced.
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
  result_path text,
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
