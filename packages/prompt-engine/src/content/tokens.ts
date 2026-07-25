/**
 * Token accounting. We use a fast heuristic (~4 chars/token) rather than a
 * tokenizer dependency: retrieval budgeting only needs to be approximately
 * right, and being provider-agnostic matters more than exactness here. Swap in
 * a real tokenizer behind `estimateTokens` if a slot ever needs tight packing.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Greedy knapsack: keep items in priority order until the token budget is spent.
 * Items are assumed pre-sorted best-first; we never reorder, only drop the tail,
 * so the highest-value knowledge always survives truncation.
 */
export function packByBudget<T>(
  items: readonly T[],
  budget: number,
  tokensOf: (item: T) => number,
): T[] {
  const kept: T[] = [];
  let spent = 0;
  for (const item of items) {
    const cost = tokensOf(item);
    if (spent + cost > budget) continue;
    kept.push(item);
    spent += cost;
  }
  return kept;
}
