import type { ScoredChunk, VectorSearchParams, VectorStore } from "../../ports";
import type { Chunk } from "../../schema/chunk";
import type { ChunkScore } from "../../schema/scoring";
import { chunkToUpsertPayload, rowToScore, rowToScoredChunk } from "./rows";

/**
 * Minimal structural view of a Supabase client. Declaring only `rpc` keeps this
 * package free of a supabase-js dependency; the web app and worker pass their
 * existing typed client, which satisfies this shape. All access goes through
 * SQL functions (see migration 0007) so RLS and the pgvector index stay server
 * authoritative.
 */
export interface SupabaseRpcClient {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

export class SupabaseVectorStore implements VectorStore {
  constructor(private readonly client: SupabaseRpcClient) {}

  async upsert(chunks: readonly Chunk[], embeddings: readonly number[][]): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error("upsert: chunks and embeddings length mismatch");
    }
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      if (!chunk || !embedding) continue;
      await this.call("prompt_upsert_chunk", chunkToUpsertPayload(chunk, embedding));
    }
  }

  async search(params: VectorSearchParams): Promise<ScoredChunk[]> {
    const data = await this.call("prompt_search", {
      p_embedding: params.embedding,
      p_query: params.text,
      p_limit: params.limit,
      p_min_similarity: params.minSimilarity,
      p_categories: params.filter?.categories ?? null,
      p_platforms: params.filter?.platforms ?? null,
      p_product_types: params.filter?.productTypes ?? null,
      p_status: params.filter?.status ?? ["active"],
    });
    return asArray(data).map(rowToScoredChunk);
  }

  async getScores(chunkIds: readonly string[]): Promise<Map<string, ChunkScore>> {
    if (chunkIds.length === 0) return new Map();
    const data = await this.call("prompt_get_scores", { p_ids: chunkIds });
    const map = new Map<string, ChunkScore>();
    for (const row of asArray(data)) {
      const score = rowToScore(row);
      map.set(score.chunkId, score);
    }
    return map;
  }

  async applyScores(scores: readonly ChunkScore[]): Promise<void> {
    if (scores.length === 0) return;
    await this.call("prompt_apply_scores", { p_scores: scores });
  }

  async deprecate(chunkIds: readonly string[]): Promise<void> {
    if (chunkIds.length === 0) return;
    await this.call("prompt_deprecate", { p_ids: chunkIds });
  }

  private async call(fn: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new Error(`${fn} failed: ${error.message}`);
    return data;
  }
}

function asArray(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}
