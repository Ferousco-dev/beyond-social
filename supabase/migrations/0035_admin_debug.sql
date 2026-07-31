-- Read paths and the one write behind the admin debugging console.
--
-- The health console in 0032 answers "is anything wrong right now". This module
-- answers the next question, which is "why", and it answers it about one
-- specific record rather than about the platform. That difference shows up in
-- two places. Errors are returned in full instead of truncated to 200
-- characters, because the provider's exact wording is the whole clue and a
-- support report that quotes half a message is a guess. And the trace explorer
-- takes an id that spans processes, so a failure the user saw in the web app
-- can be followed through the edge functions and the publish worker.
--
-- Every function is admin-gated inside the database, following 0013, and every
-- one returns a single row carrying `observed_at` plus a jsonb array, following
-- 0032, so "nothing matched" is never rendered with a missing timestamp.

/**
 * Every record carrying one trace id, oldest first.
 *
 * The trace id is on the generation (0023) and on the scheduled post (0028),
 * which is what makes this one query rather than two guesses: the render and
 * the post that used it are joined by the request that asked for the render,
 * days apart and in different processes.
 */
create or replace function public.admin_trace_timeline(p_trace_id text)
returns table (
  observed_at timestamptz,
  records bigint,
  items jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  with events as (
    select
      'generation'::text as kind,
      g.id,
      g.user_id,
      g.status::text as status,
      g.provider || ' / ' || g.model as detail,
      g.error,
      g.created_at,
      g.updated_at
    from video_generations g
    where g.trace_id = p_trace_id
    union all
    select
      'publish'::text,
      s.id,
      s.user_id,
      s.status::text,
      s.platform::text,
      s.error,
      s.created_at,
      s.updated_at
    from scheduled_posts s
    where s.trace_id = p_trace_id
  )
  select
    v_now,
    (select count(*) from events)::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(ordered) order by ordered.created_at)
        from (select * from events order by created_at) as ordered
      ),
      '[]'::jsonb
    );
end; $$;

/**
 * Failures in a window with the provider's own error text, untruncated.
 *
 * `p_kind` narrows to one source. 'ai' rows come from ai_usage, which records
 * one row per attempt including the failed ones, and which carries no trace id,
 * so those rows are correlated by request_id instead.
 */
create or replace function public.admin_failure_details(
  p_since timestamptz,
  p_until timestamptz,
  p_kind  text default 'all',
  p_limit int default 50
)
returns table (
  observed_at timestamptz,
  matched bigint,
  items jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  if p_kind not in ('all', 'generation', 'publish', 'ai') then
    raise exception 'Unknown failure kind: %', p_kind;
  end if;

  return query
  with failures as (
    select
      'generation'::text as kind,
      g.id::text as id,
      g.user_id,
      g.provider || ' / ' || g.model as detail,
      coalesce(g.error, '') as error,
      g.trace_id as correlation,
      g.updated_at as failed_at
    from video_generations g
    where p_kind in ('all', 'generation')
      and g.status = 'failed'
      and g.updated_at >= p_since and g.updated_at < p_until
    union all
    select
      'publish'::text,
      s.id::text,
      s.user_id,
      s.platform::text,
      coalesce(s.error, ''),
      s.trace_id,
      s.updated_at
    from scheduled_posts s
    where p_kind in ('all', 'publish')
      and s.status = 'failed'
      and s.updated_at >= p_since and s.updated_at < p_until
    union all
    select
      'ai'::text,
      u.id::text,
      u.user_id,
      u.provider || ' / ' || u.model,
      coalesce(u.error, ''),
      u.request_id,
      u.created_at
    from ai_usage u
    where p_kind in ('all', 'ai')
      and not u.ok
      and u.created_at >= p_since and u.created_at < p_until
  )
  select
    v_now,
    (select count(*) from failures)::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(top) order by top.failed_at desc)
        from (select * from failures order by failed_at desc limit greatest(p_limit, 0)) as top
      ),
      '[]'::jsonb
    );
end; $$;

/**
 * Work that entered a transient state and never left it.
 *
 * Wider than admin_stuck_pipeline in 0032 on purpose. That function looks for
 * posts still sitting in 'publishing'; this one looks for any post that set
 * publish_started_at and never reached 'published', which also catches the row
 * a dying worker marked 'failed' after it had already called the platform.
 * `already_posted` carries that distinction: an external id means the platform
 * accepted the video whatever the status column says.
 */
create or replace function public.admin_stuck_work(
  p_generating_stale interval default interval '20 minutes',
  p_publishing_stale interval default interval '5 minutes',
  p_limit int default 50
)
returns table (
  observed_at timestamptz,
  generating_stuck bigint,
  publish_incomplete bigint,
  items jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return query
  with stuck as (
    select
      'generation'::text as kind,
      g.id,
      g.user_id,
      g.status::text as status,
      g.provider || ' / ' || g.model as detail,
      g.trace_id as correlation,
      g.updated_at as since,
      false as already_posted,
      false as retryable
    from video_generations g
    where g.status = 'generating'
      and g.updated_at < v_now - p_generating_stale
    union all
    select
      'publish'::text,
      s.id,
      s.user_id,
      s.status::text,
      s.platform::text,
      s.trace_id,
      s.publish_started_at,
      s.external_id is not null,
      -- Mirrors claim_post_for_publish: an external id is the one marker that
      -- ends a post's life, so anything carrying one is never offered a retry.
      s.external_id is null and s.status <> 'published'
    from scheduled_posts s
    where s.publish_started_at is not null
      and s.status <> 'published'
      and s.publish_started_at < v_now - p_publishing_stale
  )
  select
    v_now,
    (select count(*) from stuck where kind = 'generation')::bigint,
    (select count(*) from stuck where kind = 'publish')::bigint,
    coalesce(
      (
        select jsonb_agg(to_jsonb(top) order by top.since)
        from (select * from stuck order by since limit greatest(p_limit, 0)) as top
      ),
      '[]'::jsonb
    );
end; $$;

/**
 * Puts one post back in front of the scheduler.
 *
 * This does not publish anything and deliberately cannot. It resets the row to
 * the state claim_due_posts scans for, so the retry re-enters through the
 * existing path: the scheduler claims it, BullMQ keys the job on the post id,
 * and the worker calls claim_post_for_publish, which refuses any row carrying
 * an external id. The idempotency guarantee is therefore unchanged by this
 * function, because this function is not part of it.
 *
 * external_id is never cleared. Clearing it would be the one edit that turns a
 * retry into a duplicate post, so the column is not written here at all.
 */
create or replace function public.admin_retry_post(
  p_post uuid,
  p_reason text default '',
  p_ip inet default null
)
returns table (
  id uuid,
  requeued_at timestamptz,
  may_have_posted boolean
)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_before scheduled_posts;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_before from scheduled_posts p where p.id = p_post for update;

  if not found then
    raise exception 'No such post';
  end if;

  if v_before.external_id is not null then
    raise exception 'Post already reached the platform';
  end if;

  if v_before.status not in ('failed', 'publishing') then
    raise exception 'Post is not in a retryable state: %', v_before.status;
  end if;

  update scheduled_posts p
     set status = 'scheduled',
         scheduled_for = now(),
         publish_started_at = null,
         error = null
   where p.id = p_post;

  -- The audit row is written inside the same transaction as the change, so a
  -- retry that lands is a retry that is recorded. There is no ordering in which
  -- one exists without the other.
  perform admin_log_action(
    'debug.post.retry',
    'scheduled_post',
    p_post::text,
    coalesce(nullif(p_reason, ''), 'Requeued from the debugging console'),
    jsonb_build_object(
      'status', v_before.status,
      'error', v_before.error,
      'publish_started_at', v_before.publish_started_at,
      'scheduled_for', v_before.scheduled_for
    ),
    jsonb_build_object('status', 'scheduled', 'error', null),
    p_ip
  );

  return query
  select p_post, now(), v_before.publish_started_at is not null;
end; $$;

-- Trace lookups scan scheduled_posts by an id that most rows do not carry.
create index if not exists scheduled_posts_trace_id_idx
  on public.scheduled_posts (trace_id)
  where trace_id is not null;

-- The failure inspector filters ai_usage on the failed rows only, which are a
-- small minority of a table that grows with every call.
create index if not exists ai_usage_failed_idx
  on public.ai_usage (created_at desc)
  where not ok;

grant execute on function public.admin_trace_timeline(text) to authenticated;
grant execute on function public.admin_failure_details(timestamptz, timestamptz, text, int)
  to authenticated;
grant execute on function public.admin_stuck_work(interval, interval, int) to authenticated;
grant execute on function public.admin_retry_post(uuid, text, inet) to authenticated;
