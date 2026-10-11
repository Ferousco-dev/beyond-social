-- Shared rate limiting.
--
-- The auth throttle was an in-memory Map, which on Vercel means per-instance.
-- An attacker spreading attempts across instances gets a fresh budget each time,
-- so the limit that is supposed to stop credential stuffing and OTP brute force
-- barely applies. A limiter that does not hold across instances is closer to
-- decoration than defence.
--
-- Fixed window rather than sliding: it is one row and one statement, and the
-- worst case is a caller getting up to 2x the limit across a window boundary,
-- which is an acceptable trade for auth throttling.

create table if not exists public.rate_limits (
  -- Caller-scoped key, e.g. "signin:203.0.113.4". Never a raw secret.
  key        text primary key,
  count      int not null default 0,
  window_end timestamptz not null
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_end);

alter table public.rate_limits enable row level security;
-- No policy: infrastructure, reached only by the service role. A client that
-- could read this could enumerate which accounts are being attacked.

/*
 * Counts one attempt and says whether it is allowed.
 *
 * The whole check is one atomic upsert, so two concurrent requests cannot both
 * read a stale count and both be allowed through. That race is exactly how a
 * naive limiter is bypassed.
 */
create or replace function public.rate_limit_hit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns table (allowed boolean, remaining int, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_window_end timestamptz;
begin
  insert into public.rate_limits (key, count, window_end)
  values (p_key, 1, now() + make_interval(secs => greatest(p_window_seconds, 1)))
  on conflict (key) do update
    -- An expired window restarts rather than accumulating forever.
    set count = case
          when public.rate_limits.window_end <= now() then 1
          else public.rate_limits.count + 1
        end,
        window_end = case
          when public.rate_limits.window_end <= now()
            then now() + make_interval(secs => greatest(p_window_seconds, 1))
          else public.rate_limits.window_end
        end
  returning public.rate_limits.count, public.rate_limits.window_end
    into v_count, v_window_end;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    greatest(ceil(extract(epoch from (v_window_end - now())))::int, 0);
end;
$$;

/** Drops windows that have closed, so the table does not grow without bound. */
create or replace function public.rate_limit_prune()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed bigint;
begin
  delete from public.rate_limits where window_end <= now() - interval '1 hour';
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
revoke execute on function public.rate_limit_prune() from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
grant execute on function public.rate_limit_prune() to service_role;
