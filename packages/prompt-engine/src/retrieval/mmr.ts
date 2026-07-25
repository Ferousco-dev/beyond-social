import type { RankedChunk } from "./rank";

/**
 * Maximal Marginal Relevance for diversity. Retrieval often surfaces several
 * near-duplicate chunks; feeding all of them wastes the token budget and biases
 * the model. MMR greedily picks the item that maximizes
 * `lambda*relevance - (1-lambda)*maxSimilarityToAlreadyChosen`.
 *
 * Redundancy is measured with token-set Jaccard rather than embedding cosine, so
 * we do not need to carry vectors past the store. It reliably catches the
 * lexical near-duplicates that dominate real corpora; swap in cosine here if
 * candidate embeddings are ever threaded through.
 */
export function mmrSelect(
  candidates: readonly RankedChunk[],
  lambda: number,
  limit: number,
): RankedChunk[] {
  const pool = [...candidates];
  const selected: RankedChunk[] = [];
  const tokenSets = new Map<string, Set<string>>();
  for (const c of pool) tokenSets.set(c.chunk.id, tokenize(c.chunk.body));

  while (selected.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      if (candidate === undefined) continue;
      const redundancy = maxSimilarity(tokenSets, candidate, selected);
      const score = lambda * candidate.relevance - (1 - lambda) * redundancy;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    const [picked] = pool.splice(bestIndex, 1);
    if (picked) selected.push(picked);
  }
  return selected;
}

function maxSimilarity(
  tokenSets: ReadonlyMap<string, Set<string>>,
  candidate: RankedChunk,
  selected: readonly RankedChunk[],
): number {
  const a = tokenSets.get(candidate.chunk.id);
  if (!a || selected.length === 0) return 0;
  let max = 0;
  for (const other of selected) {
    const b = tokenSets.get(other.chunk.id);
    if (!b) continue;
    const sim = jaccard(a, b);
    if (sim > max) max = sim;
  }
  return max;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}
