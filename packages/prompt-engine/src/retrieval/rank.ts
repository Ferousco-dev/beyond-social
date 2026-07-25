import type { ScoredChunk } from "../ports";
import type { RankingWeights } from "../schema/scoring";
import { reciprocalRankFusion } from "./fusion";

export interface RankedChunk extends ScoredChunk {
  /** Blended relevance in 0..1, the value MMR and budgeting operate on. */
  relevance: number;
}

/** The request context ranking uses for the context-match term. */
export interface RankContext {
  platforms?: readonly string[];
  productTypes?: readonly string[];
}

/**
 * Blend the retrieval signals into one relevance score. Retrieval is not
 * similarity-only: RRF-fused dense+sparse rank, the cross-encoder rerank, the
 * feedback-derived quality and confidence, time-decayed popularity, real-world
 * success rate, recency, and context fit all contribute. Weights are
 * recipe-versioned, so ranking changes are reproducible and A/B-testable.
 */
export function rankCandidates(
  candidates: readonly ScoredChunk[],
  rerankScores: ReadonlyMap<string, number>,
  weights: RankingWeights,
  context: RankContext = {},
): RankedChunk[] {
  const fusion = reciprocalRankFusion(candidates);
  const maxPopularity = Math.max(1, ...candidates.map((c) => c.score.popularity));
  const freshness = freshnessScores(candidates);

  const ranked = candidates.map((candidate): RankedChunk => {
    const id = candidate.chunk.id;
    const relevance =
      weights.similarity * (fusion.get(id) ?? 0) +
      weights.rerank * (rerankScores.get(id) ?? 0) +
      weights.quality * candidate.score.qualityScore +
      weights.confidence * candidate.score.confidence +
      weights.popularity * (candidate.score.popularity / maxPopularity) +
      weights.successRate * successRate(candidate) +
      weights.freshness * (freshness.get(id) ?? 0) +
      weights.contextMatch * contextMatch(candidate, context);
    return { ...candidate, relevance };
  });

  return ranked.sort((a, b) => b.relevance - a.relevance);
}

/** Accept / (accept + reject); falls back to the quality posterior when unseen. */
function successRate(candidate: ScoredChunk): number {
  const decided = candidate.score.acceptCount + candidate.score.rejectCount;
  return decided === 0 ? candidate.score.qualityScore : candidate.score.acceptCount / decided;
}

/** Relative recency within the candidate set (newest = 1), so no clock needed. */
function freshnessScores(candidates: readonly ScoredChunk[]): Map<string, number> {
  const times = candidates.map((c) => Date.parse(c.chunk.updatedAt));
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = max - min;
  const out = new Map<string, number>();
  candidates.forEach((c, i) => {
    const t = times[i] ?? min;
    out.set(c.chunk.id, span === 0 ? 1 : (t - min) / span);
  });
  return out;
}

/** Fraction of the request's platform/product hints the chunk applies to. */
function contextMatch(candidate: ScoredChunk, context: RankContext): number {
  const wanted = [...(context.platforms ?? []), ...(context.productTypes ?? [])].filter(Boolean);
  if (wanted.length === 0) return 0.5; // no signal: neutral
  const applies = new Set<string>([
    ...candidate.chunk.applicability.platforms,
    ...candidate.chunk.applicability.productTypes,
  ]);
  if (applies.size === 0) return 0.5; // universal chunk: neutral, not penalized
  const hits = wanted.filter((w) => applies.has(w)).length;
  return hits / wanted.length;
}
