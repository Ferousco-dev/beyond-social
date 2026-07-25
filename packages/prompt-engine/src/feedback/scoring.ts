import type { Outcome } from "../schema/feedback";
import type { ChunkScore } from "../schema/scoring";

/**
 * Beta-Bernoulli update of a chunk's quality from one outcome. We treat each
 * generation a chunk took part in as a trial: accepted is a success, rejected a
 * failure, an edit a partial success scaled by how little was changed, and a
 * regeneration a soft failure. The posterior mean is the quality score; its
 * variance yields confidence, so a chunk with little evidence is trusted less
 * even at the same mean. This is deliberately conservative: a single bad
 * generation cannot tank a well-established chunk.
 */

/** Learning rate: outcomes add fractional pseudo-counts, not whole ones, so the
 * base rate moves smoothly and early noise cannot whipsaw a chunk. */
const STRENGTH = 0.5;

export function outcomeWeights(
  outcome: Outcome,
  editDistance: number | null,
): { success: number; failure: number } {
  switch (outcome) {
    case "accepted":
      return { success: STRENGTH, failure: 0 };
    case "rejected":
      return { success: 0, failure: STRENGTH };
    case "regenerated":
      return { success: 0, failure: STRENGTH * 0.5 };
    case "edited": {
      // Small edits are near-acceptance; heavy edits lean negative.
      const kept = 1 - (editDistance ?? 0.5);
      return { success: STRENGTH * kept, failure: STRENGTH * (1 - kept) };
    }
  }
}

export function applyOutcome(
  score: ChunkScore,
  outcome: Outcome,
  editDistance: number | null,
  now: string,
): ChunkScore {
  const { success, failure } = outcomeWeights(outcome, editDistance);
  const alpha = score.alpha + success;
  const beta = score.beta + failure;
  return {
    ...score,
    alpha,
    beta,
    qualityScore: posteriorMean(alpha, beta),
    confidence: posteriorConfidence(alpha, beta),
    usageCount: score.usageCount + 1,
    acceptCount: score.acceptCount + (outcome === "accepted" ? 1 : 0),
    rejectCount: score.rejectCount + (outcome === "rejected" ? 1 : 0),
    editCount: score.editCount + (outcome === "edited" ? 1 : 0),
    popularity: score.popularity + 1,
    lastUsedAt: now,
    updatedAt: now,
  };
}

export function posteriorMean(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

/**
 * Confidence from posterior concentration. Beta variance is
 * a*b / ((a+b)^2 (a+b+1)); we map it to 0..1 where more evidence (larger a+b)
 * gives higher confidence. The max variance for a mean is at 0.5, so we
 * normalize against that to keep the scale interpretable.
 */
export function posteriorConfidence(alpha: number, beta: number): number {
  const n = alpha + beta;
  const variance = (alpha * beta) / (n * n * (n + 1));
  const maxVariance = 0.25 / (n + 1);
  return maxVariance === 0 ? 1 : 1 - variance / maxVariance;
}

/** A fresh score seeded from the author's prior, expressed as pseudo-counts. */
export function seedScore(chunkId: string, priorQuality: number, now: string): ChunkScore {
  const priorStrength = 4; // author's prior worth ~4 observations
  const alpha = Math.max(0.01, priorQuality * priorStrength);
  const beta = Math.max(0.01, (1 - priorQuality) * priorStrength);
  return {
    chunkId,
    alpha,
    beta,
    qualityScore: posteriorMean(alpha, beta),
    confidence: posteriorConfidence(alpha, beta),
    usageCount: 0,
    acceptCount: 0,
    rejectCount: 0,
    editCount: 0,
    popularity: 0,
    lastUsedAt: null,
    updatedAt: now,
  };
}
