import type { ScoredChunk } from "../ports";
import type { RankingWeights } from "../schema/scoring";
import { reciprocalRankFusion } from "./fusion";

export interface RankedChunk extends ScoredChunk {
  /** Blended relevance in 0..1, the value MMR and budgeting operate on. */
  relevance: number;
}

/**
 * Blend the retrieval signals into one relevance score. Similarity comes from
 * RRF-fused dense+sparse rank; rerank from the cross-encoder; quality and
 * confidence from the feedback loop; popularity (time-decayed) is min-max
 * normalized across the candidate set so a viral chunk cannot dominate on scale
 * alone. Weights are recipe-versioned, so ranking changes are reproducible.
 */
export function rankCandidates(
  candidates: readonly ScoredChunk[],
  rerankScores: ReadonlyMap<string, number>,
  weights: RankingWeights,
): RankedChunk[] {
  const fusion = reciprocalRankFusion(candidates);
  const maxPopularity = Math.max(1, ...candidates.map((c) => c.score.popularity));

  const ranked = candidates.map((candidate): RankedChunk => {
    const id = candidate.chunk.id;
    const relevance =
      weights.similarity * (fusion.get(id) ?? 0) +
      weights.rerank * (rerankScores.get(id) ?? 0) +
      weights.quality * candidate.score.qualityScore +
      weights.confidence * candidate.score.confidence +
      weights.popularity * (candidate.score.popularity / maxPopularity);
    return { ...candidate, relevance };
  });

  return ranked.sort((a, b) => b.relevance - a.relevance);
}
