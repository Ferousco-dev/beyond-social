import type { ScoredChunk } from "../ports";

/**
 * Reciprocal Rank Fusion. Dense (cosine) and sparse (BM25) scores live on
 * different scales and are not comparable directly; RRF fuses by rank instead of
 * raw score, which is robust and parameter-light. Each leg contributes
 * 1/(k+rank); k=60 is the standard smoothing constant. Returns a normalized
 * 0..1 fusion score per chunk id.
 */
const RRF_K = 60;

export function reciprocalRankFusion(candidates: readonly ScoredChunk[]): Map<string, number> {
  const denseRank = rankBy(candidates, (c) => c.similarity);
  const sparseRank = rankBy(candidates, (c) => (c.lexicalRank === null ? null : -c.lexicalRank));

  const fused = new Map<string, number>();
  let max = 0;
  for (const candidate of candidates) {
    const id = candidate.chunk.id;
    const dense = denseRank.get(id);
    const sparse = sparseRank.get(id);
    const score =
      (dense === undefined ? 0 : 1 / (RRF_K + dense)) +
      (sparse === undefined ? 0 : 1 / (RRF_K + sparse));
    fused.set(id, score);
    if (score > max) max = score;
  }
  if (max > 0) for (const [id, score] of fused) fused.set(id, score / max);
  return fused;
}

/** Rank ids by a descending key; null keys are excluded from that leg. */
function rankBy(
  candidates: readonly ScoredChunk[],
  key: (c: ScoredChunk) => number | null,
): Map<string, number> {
  const withKey = candidates
    .map((c) => ({ id: c.chunk.id, value: key(c) }))
    .filter((entry): entry is { id: string; value: number } => entry.value !== null)
    .sort((a, b) => b.value - a.value);
  const ranks = new Map<string, number>();
  withKey.forEach((entry, index) => ranks.set(entry.id, index + 1));
  return ranks;
}
