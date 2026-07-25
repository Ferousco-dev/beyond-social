# chunks/ - subsystem, not a data folder

A "chunk" is the atomic retrievable unit produced from an authored file by
splitting on H2 and re-splitting anything oversized, then attaching a contextual
header and metadata. Chunks are **derived**, so they are not stored as files.

- **Schema:** `packages/prompt-engine/src/schema/chunk.ts` (the canonical shape).
- **Where they live:** `prompt_chunks.data` (jsonb) with projected columns for
  filtering, migration `0007`.
- **How they are made:** `buildChunksFromFile` (`ingest/build.ts`), pure and
  deterministic.

To change what a chunk contains, edit the authored file under a category folder
(e.g. `layouts/`) and re-ingest. Never hand-edit derived chunk rows.
