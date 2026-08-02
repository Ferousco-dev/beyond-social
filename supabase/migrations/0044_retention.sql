-- Retention.
--
-- The policy, decided rather than assumed:
--
--   messages            kept forever. They are the record of work someone paid
--                       for, and deleting them quietly is the kind of thing
--                       people leave over. Text is cheap.
--   video_generations   kept forever, for the same reason. It is user work.
--   message_embeddings  vectors older than twelve months are deleted. The
--                       message stays; only the vector goes. Semantic search
--                       stops reaching past a year, and because the message
--                       survives, any deleted vector can be recomputed.
--   ai_usage            full rows for ninety days, then rolled into daily
--                       totals and the detail deleted. Spend history and charts
--                       survive; the per-call rows do not.
--
-- Every function here defaults to a DRY RUN. Calling it reports what it would
-- remove and removes nothing. Deletion requires passing p_dry_run => false
-- explicitly, so the first accidental invocation cannot be the destructive one.

-- ---------------------------------------------------------------------------
-- Where rolled-up usage lands.
--
-- One row per user, per day, per model. The grain is deliberate: it answers
-- every question the usage page and the admin spend view actually ask, and none
-- of the ones that need an individual call, which is what the ninety day window
-- is for.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage_daily (
  user_id uuid references auth.users (id) on delete cascade,
  day date not null,
  model text not null,
  provider text not null,
  calls integer not null default 0,
  cached_calls integer not null default 0,
  failed_calls integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  primary key (user_id, day, model)
);

alter table public.ai_usage_daily enable row level security;

create policy ai_usage_daily_owner on public.ai_usage_daily
  for select
  using ((select auth.uid()) = user_id);

create index if not exists ai_usage_daily_day_idx on public.ai_usage_daily (day desc);

/*
 * Prunes embeddings older than the retention window.
 *
 * Deletes from message_embeddings only. The message it points at is untouched,
 * so the thread still reads back in full and the vector can be regenerated from
 * the text if the window is ever widened again.
 */
create or replace function public.retention_prune_embeddings(
  p_dry_run boolean default true,
  p_older_than interval default interval '12 months'
)
returns table (affected bigint, oldest timestamptz, dry_run boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count bigint;
  v_oldest timestamptz;
begin
  select count(*), min(created_at) into v_count, v_oldest
  from public.message_embeddings
  where created_at < now() - p_older_than;

  if not p_dry_run and v_count > 0 then
    delete from public.message_embeddings
    where created_at < now() - p_older_than;
  end if;

  return query select v_count, v_oldest, p_dry_run;
end;
$$;

/*
 * Rolls ai_usage detail older than the window into daily totals.
 *
 * The aggregate is written before the detail is deleted, and both happen in one
 * statement's transaction, so a failure halfway cannot leave the rows counted
 * twice or lost entirely. Re-running is safe: the upsert adds only what the
 * delete then removes.
 */
create or replace function public.retention_rollup_ai_usage(
  p_dry_run boolean default true,
  p_older_than interval default interval '90 days'
)
returns table (affected bigint, oldest timestamptz, dry_run boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count bigint;
  v_oldest timestamptz;
  v_cutoff timestamptz := now() - p_older_than;
begin
  select count(*), min(created_at) into v_count, v_oldest
  from public.ai_usage
  where created_at < v_cutoff;

  if not p_dry_run and v_count > 0 then
    insert into public.ai_usage_daily as d (
      user_id, day, model, provider,
      calls, cached_calls, failed_calls, input_tokens, output_tokens, cost_usd
    )
    select
      u.user_id,
      u.created_at::date,
      u.model,
      u.provider,
      count(*),
      count(*) filter (where u.cached),
      count(*) filter (where not u.ok),
      sum(u.input_tokens),
      sum(u.output_tokens),
      sum(u.cost_usd)
    from public.ai_usage u
    where u.created_at < v_cutoff
    group by u.user_id, u.created_at::date, u.model, u.provider
    on conflict (user_id, day, model) do update set
      calls = d.calls + excluded.calls,
      cached_calls = d.cached_calls + excluded.cached_calls,
      failed_calls = d.failed_calls + excluded.failed_calls,
      input_tokens = d.input_tokens + excluded.input_tokens,
      output_tokens = d.output_tokens + excluded.output_tokens,
      cost_usd = d.cost_usd + excluded.cost_usd;

    delete from public.ai_usage where created_at < v_cutoff;
  end if;

  return query select v_count, v_oldest, p_dry_run;
end;
$$;

-- Neither is callable by a signed-in user. Retention is an operator action.
revoke all on function public.retention_prune_embeddings(boolean, interval) from public, anon, authenticated;
revoke all on function public.retention_rollup_ai_usage(boolean, interval) from public, anon, authenticated;
grant execute on function public.retention_prune_embeddings(boolean, interval) to service_role;
grant execute on function public.retention_rollup_ai_usage(boolean, interval) to service_role;
