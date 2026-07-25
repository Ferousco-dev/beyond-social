# training/ - the knowledge-growth pipeline

We do not fine-tune an LLM here; we train the **knowledge base**. The pipeline
grows and sharpens the corpus without letting it bloat.

Stages (`ingest/pipeline.ts` plus the feedback subsystem):

1. **Ingestion** - parse authored files; validate frontmatter against the schema.
2. **Chunking** - split on H2, re-split oversized sections.
3. **Contextualization** - prepend a situating header before embedding.
4. **Dedup** - drop exact duplicates by content hash within a run; near-duplicate
   detection at retrieval time via MMR.
5. **Embedding** - batched, idempotent (only changed hashes).
6. **Indexing** - upsert into pgvector + full-text; seed a Beta score on first
   insert.
7. **Scoring** - per-event Beta updates from feedback; periodic popularity decay.
8. **Candidate promotion** - heavy user edits are mined into `learned` candidate
   chunks (`status: candidate`), reviewed before activation.
9. **Retirement** - high-confidence low-quality chunks are deprecated.

Run ingestion on the existing BullMQ worker for large corpora. Growth is bounded
because promotion is gated and low-value chunks are retired, not accumulated.
