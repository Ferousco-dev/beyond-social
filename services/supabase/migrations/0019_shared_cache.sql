-- Shared caches for embeddings and deterministic completions.
--
-- Both caches were in-process. On Vercel that means per-instance and lost on
-- every cold start, so the hit rate in production is close to zero and we pay
-- the provider again for text we have already embedded. A cache that only works
-- on a long-running worker is not a cache for this deployment.
--
-- Postgres rather than Redis, deliberately. Redis is in the stack for BullMQ,
-- but a TCP connection per serverless invocation is the wrong shape, and the
-- alternative is a new vendor and a new dependency. A Postgres round trip is
-- vastly cheaper than an embedding call, which is the only comparison that
-- matters here.

-- Stored as float8[] rather than vector on purpose. Nothing searches this table
-- by similarity: it is a lookup by content hash. Avoiding `vector` avoids
-- committing to one dimension, so switching between a 1024-dim and a 3072-dim
-- model needs no migration.
create table if not exists public.embedding_cache (
  -- sha256 of (model, text), computed by the caller.
  key          text primary key,
  model        text not null,
  embedding    float8[] not null,
  created_at   timestamptz not null default now(),
  -- Touched on read so eviction can drop what nobody wants rather than what is
  -- merely old.
  last_used_at timestamptz not null default now()
);

create index if not exists embedding_cache_lru_idx on public.embedding_cache (last_used_at);

alter table public.embedding_cache enable row level security;
-- No policy: this is infrastructure, reached only by the service role. It holds
-- no user data, but a shared cache readable by clients would leak which text
-- other users have embedded.

create table if not exists public.response_cache (
  key          text primary key,
  model        text not null,
  response     text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at   timestamptz not null default now(),
  -- Completions are only cacheable at temperature 0, and even then a model
  -- revision changes the answer, so entries expire rather than living forever.
  expires_at   timestamptz not null
);

create index if not exists response_cache_expiry_idx on public.response_cache (expires_at);

alter table public.response_cache enable row level security;

/*
 * Reads an embedding and records the hit in one round trip.
 *
 * Doing the touch here rather than as a second statement halves the latency of
 * the common case, which is the whole point of the cache.
 */
create or replace function public.embedding_cache_get(p_key text)
returns float8[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_embedding float8[];
begin
  update public.embedding_cache
     set last_used_at = now()
   where key = p_key
  returning embedding into v_embedding;

  return v_embedding;
end;
$$;

create or replace function public.embedding_cache_put(
  p_key text,
  p_model text,
  p_embedding float8[]
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.embedding_cache (key, model, embedding)
  values (p_key, p_model, p_embedding)
  -- A concurrent write of the same key is a race between two identical values,
  -- so the conflict is ignored rather than treated as an error.
  on conflict (key) do update set last_used_at = now();
$$;

create or replace function public.response_cache_get(p_key text)
returns text
language sql
security definer
set search_path = public
as $$
  select response
    from public.response_cache
   where key = p_key
     and expires_at > now();
$$;

create or replace function public.response_cache_put(
  p_key text,
  p_model text,
  p_response text,
  p_ttl_seconds int,
  p_input_tokens int default 0,
  p_output_tokens int default 0
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.response_cache (
    key, model, response, input_tokens, output_tokens, expires_at
  )
  values (
    p_key, p_model, p_response, p_input_tokens, p_output_tokens,
    now() + make_interval(secs => greatest(p_ttl_seconds, 1))
  )
  on conflict (key) do update
    set response = excluded.response,
        expires_at = excluded.expires_at;
$$;

/*
 * Bounds both tables.
 *
 * An unbounded cache is a slowly growing bill. Expired completions go first,
 * then the least recently used embeddings once the table exceeds its ceiling.
 * Returns what it removed so a scheduled run can be seen to have worked.
 */
create or replace function public.cache_prune(p_max_embeddings int default 200000)
returns table (embeddings_removed bigint, responses_removed bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_responses bigint;
  v_embeddings bigint;
begin
  delete from public.response_cache where expires_at <= now();
  get diagnostics v_responses = row_count;

  delete from public.embedding_cache
   where key in (
     select key from public.embedding_cache
      order by last_used_at desc
      offset greatest(p_max_embeddings, 1000)
   );
  get diagnostics v_embeddings = row_count;

  return query select v_embeddings, v_responses;
end;
$$;

-- Service role only: these bypass RLS by design and must not be callable by a
-- signed-in user.
revoke execute on function public.embedding_cache_get(text) from public, anon, authenticated;
revoke execute on function public.embedding_cache_put(text, text, float8[]) from public, anon, authenticated;
revoke execute on function public.response_cache_get(text) from public, anon, authenticated;
revoke execute on function public.response_cache_put(text, text, text, int, int, int) from public, anon, authenticated;
revoke execute on function public.cache_prune(int) from public, anon, authenticated;

grant execute on function public.embedding_cache_get(text) to service_role;
grant execute on function public.embedding_cache_put(text, text, float8[]) to service_role;
grant execute on function public.response_cache_get(text) to service_role;
grant execute on function public.response_cache_put(text, text, text, int, int, int) to service_role;
grant execute on function public.cache_prune(int) to service_role;
