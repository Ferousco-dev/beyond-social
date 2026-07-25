/**
 * Token estimation. Used for pre-flight checks (context window, rate-limit cost)
 * where being approximately right beforehand beats being exactly right after
 * the fact. Actual billing always uses the provider's reported counts.
 *
 * ~4 characters per token holds well enough for English prose; swap in a real
 * tokenizer here if a caller ever needs tight packing.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}
