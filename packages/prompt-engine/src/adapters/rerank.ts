import type { Reranker, ScoredChunk } from "../ports";
import { postJson } from "./http";

/**
 * Neutral reranker: returns an empty map, so the rerank term contributes 0
 * uniformly and never changes ordering. This is the safe default when no
 * cross-encoder is configured; the pipeline still ranks on fused
 * similarity + quality + popularity.
 */
export class PassthroughReranker implements Reranker {
  readonly model = "passthrough";
  async rerank(): Promise<Map<string, number>> {
    return new Map();
  }
}

interface RerankResponse {
  data: { index: number; relevance_score: number }[];
}

/**
 * Voyage reranker (cross-encoder). Meaningfully improves precision@k by scoring
 * each candidate jointly with the query, catching relevance a bi-encoder misses.
 * Scores are returned already in 0..1.
 */
export class VoyageReranker implements Reranker {
  constructor(
    private readonly apiKey: string,
    readonly model = "rerank-2.5",
  ) {}

  async rerank(query: string, candidates: readonly ScoredChunk[]): Promise<Map<string, number>> {
    if (candidates.length === 0) return new Map();
    const documents = candidates.map((c) => c.chunk.body);
    const res = await postJson<RerankResponse>(
      "https://api.voyageai.com/v1/rerank",
      { authorization: `Bearer ${this.apiKey}` },
      { query, documents, model: this.model },
    );
    const out = new Map<string, number>();
    for (const item of res.data) {
      const candidate = candidates[item.index];
      if (candidate) out.set(candidate.chunk.id, item.relevance_score);
    }
    return out;
  }
}
