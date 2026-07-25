import { z } from "zod";

import type { ScoredChunk } from "../../ports";
import { chunkSchema, type Chunk } from "../../schema/chunk";
import { chunkScoreSchema, type ChunkScore } from "../../schema/scoring";

/**
 * The `prompt_search` SQL function returns each chunk's columns flattened
 * alongside its live score and the two retrieval signals. We validate every row
 * with Zod at the boundary, so a schema drift in the database surfaces as a
 * clear parse error rather than an undefined field deep in ranking.
 */
export const searchRowSchema = z.object({
  chunk: chunkSchema,
  score: chunkScoreSchema,
  similarity: z.number().nullable(),
  lexical_rank: z.number().nullable(),
});

export function rowToScoredChunk(row: unknown): ScoredChunk {
  const parsed = searchRowSchema.parse(row);
  return {
    chunk: parsed.chunk,
    score: parsed.score,
    similarity: parsed.similarity,
    lexicalRank: parsed.lexical_rank,
  };
}

/** Payload shape written by `prompt_upsert_chunk`; mirrors the chunk columns. */
export function chunkToUpsertPayload(
  chunk: Chunk,
  embedding: readonly number[],
): Record<string, unknown> {
  return { p_chunk: chunk, p_embedding: embedding };
}

export const scoreRowSchema = chunkScoreSchema;

export function rowToScore(row: unknown): ChunkScore {
  return scoreRowSchema.parse(row);
}
