# embeddings/ - subsystem, not a data folder

Embeddings are a **derived artifact**, a pure function of authored chunk content
and the embedding model. They are **not committed**. Committing vectors means
megabytes of binary churn per edit and a second source of truth that silently
drifts from `prompts/`.

- **Where they live:** the `prompt_chunks.embedding` column (pgvector, HNSW),
  migration `0007`.
- **How they are made:** `Ingestor` (`ingest/pipeline.ts`) embeds each chunk's
  contextual header + body via the `Embedder` port (Voyage by default).
- **Idempotency:** keyed by `contentHash`; only changed chunks are re-embedded.
- **Model:** `voyage-3-large` (1024-dim). Changing the model requires a new
  column + reindex, tracked as a migration, so it is explicit and reversible.
