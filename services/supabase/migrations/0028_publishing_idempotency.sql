-- Makes scheduling and publishing safe to repeat.
--
-- Two different repeats need handling, and they are not the same problem.
--
-- The user can submit the same schedule twice: a double click, a retried form, a
-- flaky connection where the response was lost but the write landed. That is
-- solved by a key the client sends, so the second attempt lands on the first
-- row instead of creating another.
--
-- The worker can run the same job twice: BullMQ retries five times, and a
-- network error after a successful post looks exactly like a failure. Without a
-- guard the same video is published twice to a real audience, which is not a
-- state anyone can undo for the user.

alter table public.scheduled_posts
  add column if not exists idempotency_key text,
  add column if not exists trace_id text,
  -- When the platform call started. Set before the call, not after, so a job
  -- that dies mid-flight leaves evidence that it may already have posted.
  add column if not exists publish_started_at timestamptz;

comment on column public.scheduled_posts.idempotency_key is
  'Client-supplied key making a repeated schedule request land on the same row.';
comment on column public.scheduled_posts.publish_started_at is
  'Set immediately before the platform call, so a retry can tell "never tried" from "may already have posted".';

-- Scoped to the user: two people may legitimately generate the same key, and a
-- global unique constraint would let one silently block the other.
create unique index if not exists scheduled_posts_idempotency_idx
  on public.scheduled_posts (user_id, idempotency_key)
  where idempotency_key is not null;

/*
 * Claims one post for publishing, once.
 *
 * Returns nothing if the row is not in a claimable state, which is what makes a
 * duplicate job a no-op rather than a second post. The status transition and the
 * read happen in one statement, so two workers racing for the same row cannot
 * both win.
 */
create or replace function public.claim_post_for_publish(p_post uuid)
returns table (
  id uuid,
  user_id uuid,
  platform text,
  caption text,
  hashtags text,
  generation_id uuid,
  trace_id text
)
language sql
volatile
security definer
set search_path = ''
as $$
  update public.scheduled_posts p
     set publish_started_at = now()
   where p.id = p_post
     -- Already published is the case this exists for: a retried job must not
     -- post again. Anything with an external id is done, whatever its status
     -- column says.
     and p.external_id is null
     and p.status in ('scheduled', 'publishing')
  returning p.id, p.user_id, p.platform::text, p.caption, p.hashtags, p.generation_id, p.trace_id;
$$;

revoke all on function public.claim_post_for_publish(uuid) from public, anon, authenticated;
grant execute on function public.claim_post_for_publish(uuid) to service_role;
