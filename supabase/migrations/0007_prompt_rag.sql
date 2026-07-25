-- Prompt RAG storage: chunk knowledge base + live feedback scores, backed by
-- pgvector for dense retrieval and Postgres full-text for the sparse leg. All
-- access is through SECURITY DEFINER functions granted to service_role only; the
-- engine runs server-side, never from the browser. Embedding dimension is fixed
-- to the Voyage default (1024); switching embedders means a new column + reindex.

create extension if not exists vector;

-- Canonical chunk stored as jsonb (`data`) so the app's Zod Chunk is the single
-- source of truth; queryable columns are projected for filtering and indexing.
create table if not exists prompt_chunks (
  id            text primary key,
  data          jsonb not null,
  category      text not null,
  status        text not null default 'active',
  platforms     text[] not null default '{}',
  product_types text[] not null default '{}',
  content_hash  text not null,
  embedding     vector(1024) not null,
  body_tsv      tsvector,
  updated_at    timestamptz not null default now()
);

create index if not exists prompt_chunks_embedding_idx
  on prompt_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists prompt_chunks_tsv_idx on prompt_chunks using gin (body_tsv);
create index if not exists prompt_chunks_category_idx on prompt_chunks (category);
create index if not exists prompt_chunks_status_idx on prompt_chunks (status);

-- Live quality as a Beta posterior; full ChunkScore kept in `data`, mean
-- projected for fast ranking and deprecation sweeps.
create table if not exists prompt_scores (
  chunk_id      text primary key references prompt_chunks(id) on delete cascade,
  data          jsonb not null,
  quality_score double precision not null default 0.5,
  updated_at    timestamptz not null default now()
);

alter table prompt_chunks enable row level security;
alter table prompt_scores enable row level security;

-- Insert/update a chunk and seed its score from the author's prior on first sight.
create or replace function prompt_upsert_chunk(p_chunk jsonb, p_embedding jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_id text := p_chunk->>'id';
  v_prior double precision := coalesce((p_chunk->>'priorQuality')::double precision, 0.7);
  v_alpha double precision := greatest(0.01, v_prior * 4);
  v_beta  double precision := greatest(0.01, (1 - v_prior) * 4);
begin
  insert into prompt_chunks (id, data, category, status, platforms, product_types, content_hash, embedding, body_tsv, updated_at)
  values (
    v_id, p_chunk, p_chunk->>'category', coalesce(p_chunk->>'status', 'active'),
    coalesce(array(select jsonb_array_elements_text(p_chunk#>'{applicability,platforms}')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_chunk#>'{applicability,productTypes}')), '{}'),
    p_chunk->>'contentHash', (p_embedding::text)::vector,
    to_tsvector('english', coalesce(p_chunk->>'body', '')), now()
  )
  on conflict (id) do update set
    data = excluded.data, category = excluded.category, status = excluded.status,
    platforms = excluded.platforms, product_types = excluded.product_types,
    content_hash = excluded.content_hash, embedding = excluded.embedding,
    body_tsv = excluded.body_tsv, updated_at = now();

  insert into prompt_scores (chunk_id, data, quality_score)
  values (
    v_id,
    jsonb_build_object(
      'chunkId', v_id, 'alpha', v_alpha, 'beta', v_beta,
      'qualityScore', v_alpha / (v_alpha + v_beta), 'confidence', 0.1,
      'usageCount', 0, 'acceptCount', 0, 'rejectCount', 0, 'editCount', 0,
      'popularity', 0, 'lastUsedAt', null, 'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    v_alpha / (v_alpha + v_beta)
  )
  on conflict (chunk_id) do nothing;
end; $$;

-- Hybrid candidate retrieval. Returns both raw signals so the app fuses ranks.
create or replace function prompt_search(
  p_embedding jsonb, p_query text, p_limit int, p_min_similarity double precision,
  p_categories text[], p_platforms text[], p_product_types text[], p_status text[]
) returns table (chunk jsonb, score jsonb, similarity double precision, lexical_rank double precision)
language sql stable security definer set search_path = public as $$
  with q as (select (p_embedding::text)::vector as vec, plainto_tsquery('english', coalesce(p_query, '')) as tsq)
  select
    c.data as chunk,
    coalesce(s.data, jsonb_build_object('chunkId', c.id, 'alpha', 1, 'beta', 1,
      'qualityScore', 0.5, 'confidence', 0.1, 'usageCount', 0, 'acceptCount', 0,
      'rejectCount', 0, 'editCount', 0, 'popularity', 0, 'lastUsedAt', null,
      'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))) as score,
    1 - (c.embedding <=> q.vec) as similarity,
    ts_rank(c.body_tsv, q.tsq) as lexical_rank
  from prompt_chunks c
  cross join q
  left join prompt_scores s on s.chunk_id = c.id
  where c.status = any(coalesce(p_status, array['active']))
    and (p_categories is null or c.category = any(p_categories))
    and (p_platforms is null or c.platforms && p_platforms)
    and (p_product_types is null or c.product_types && p_product_types)
    and (1 - (c.embedding <=> q.vec) >= p_min_similarity or c.body_tsv @@ q.tsq)
  order by (1 - (c.embedding <=> q.vec)) desc
  limit p_limit;
$$;

create or replace function prompt_get_scores(p_ids text[])
returns table (data jsonb) language sql stable security definer set search_path = public as $$
  select data from prompt_scores where chunk_id = any(p_ids);
$$;

-- Bulk upsert of recomputed scores from the feedback loop.
create or replace function prompt_apply_scores(p_scores jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  for v_row in select * from jsonb_array_elements(p_scores) loop
    update prompt_scores set
      data = v_row,
      quality_score = (v_row->>'qualityScore')::double precision,
      updated_at = now()
    where chunk_id = v_row->>'chunkId';
  end loop;
end; $$;

create or replace function prompt_deprecate(p_ids text[])
returns void language sql security definer set search_path = public as $$
  update prompt_chunks set status = 'deprecated', updated_at = now() where id = any(p_ids);
$$;

revoke all on function prompt_upsert_chunk(jsonb, jsonb) from public, anon, authenticated;
revoke all on function prompt_search(jsonb, text, int, double precision, text[], text[], text[], text[]) from public, anon, authenticated;
revoke all on function prompt_get_scores(text[]) from public, anon, authenticated;
revoke all on function prompt_apply_scores(jsonb) from public, anon, authenticated;
revoke all on function prompt_deprecate(text[]) from public, anon, authenticated;

grant execute on function prompt_upsert_chunk(jsonb, jsonb) to service_role;
grant execute on function prompt_search(jsonb, text, int, double precision, text[], text[], text[], text[]) to service_role;
grant execute on function prompt_get_scores(text[]) to service_role;
grant execute on function prompt_apply_scores(jsonb) to service_role;
grant execute on function prompt_deprecate(text[]) to service_role;
