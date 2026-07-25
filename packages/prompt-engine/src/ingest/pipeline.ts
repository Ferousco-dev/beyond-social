import type { Embedder, VectorStore } from "../ports";
import type { Chunk } from "../schema/chunk";
import { buildChunksFromFile, type BuiltChunk } from "./build";

const EMBED_BATCH = 96;

export interface IngestInput {
  /** Stable path or id, used only for error messages. */
  ref: string;
  raw: string;
}

export interface IngestReport {
  ingested: number;
  skippedUnchanged: number;
  errors: { ref: string; message: string }[];
}

/**
 * The ingestion pipeline: parse -> chunk -> contextualize -> hash -> (skip
 * unchanged) -> embed in batches -> upsert. Idempotent by content hash: a file
 * whose derived chunks already exist with the same hash is never re-embedded, so
 * re-ingesting the whole knowledge base is cheap and only pays for what changed.
 * Score seeding happens in the SQL upsert on first insert, so re-ingest never
 * resets a chunk's learned quality.
 */
export class Ingestor {
  constructor(
    private readonly embedder: Embedder,
    private readonly store: VectorStore,
  ) {}

  async ingest(
    inputs: readonly IngestInput[],
    now: string,
    knownHashes: ReadonlySet<string> = new Set(),
  ): Promise<IngestReport> {
    const report: IngestReport = { ingested: 0, skippedUnchanged: 0, errors: [] };
    const pending: BuiltChunk[] = [];

    for (const input of inputs) {
      try {
        const built = buildChunksFromFile(input.raw, this.embedder.model, this.embedder.dim, now);
        for (const item of built) {
          if (knownHashes.has(item.chunk.contentHash)) report.skippedUnchanged++;
          else pending.push(item);
        }
      } catch (error) {
        report.errors.push({ ref: input.ref, message: asMessage(error) });
      }
    }

    const deduped = dedupeByHash(pending);
    for (let i = 0; i < deduped.length; i += EMBED_BATCH) {
      const batch = deduped.slice(i, i + EMBED_BATCH);
      const vectors = await this.embedder.embed(batch.map((b) => b.embedInput));
      await this.store.upsert(
        batch.map((b) => b.chunk),
        vectors,
      );
      report.ingested += batch.length;
    }
    return report;
  }
}

/** Collapse exact duplicates within a run (same content hash = same knowledge). */
function dedupeByHash(items: readonly BuiltChunk[]): BuiltChunk[] {
  const seen = new Set<string>();
  const out: BuiltChunk[] = [];
  for (const item of items) {
    if (seen.has(item.chunk.contentHash)) continue;
    seen.add(item.chunk.contentHash);
    out.push(item);
  }
  return out;
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type { Chunk };
