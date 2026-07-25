-- Atomically claim due scheduled posts for a worker. `for update skip locked`
-- lets many workers pull disjoint batches concurrently without contention or
-- double-publishing. Called only by the service role.
create or replace function public.claim_due_posts(p_limit integer default 20)
returns setof public.scheduled_posts
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.scheduled_posts
    set status = 'publishing'
    where id in (
      select id from public.scheduled_posts
        where status = 'scheduled' and scheduled_for <= now()
        order by scheduled_for
        for update skip locked
        limit p_limit
    )
    returning *;
end;
$$;

revoke execute on function public.claim_due_posts(integer) from public, anon, authenticated;
grant execute on function public.claim_due_posts(integer) to service_role;
