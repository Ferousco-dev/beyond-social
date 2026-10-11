import "server-only";

import { attributeFeedback, type Outcome } from "@beyond-social/prompt-engine";

import { isPromptEngineConfigured } from "@/lib/server-env";
import { logger } from "@/lib/logger";

import { getStore } from "./providers";

/**
 * Closes the learning loop: applies a user outcome to every chunk that shaped a
 * generation, updating their Beta quality scores (which change future ranking).
 * Fire-and-forget from the caller's perspective; failures are logged, not thrown,
 * so feedback never blocks the UI.
 */
export async function recordChunkOutcome(
  chunkIds: readonly string[],
  outcome: Outcome,
  editDistance: number | null,
): Promise<void> {
  if (!isPromptEngineConfigured || chunkIds.length === 0) return;
  try {
    const store = getStore();
    const current = await store.getScores(chunkIds);
    const updated = attributeFeedback(
      {
        generationId: "",
        outcome,
        editDistance,
        chunkIds: [...chunkIds],
        createdAt: new Date().toISOString(),
      },
      current,
    );
    await store.applyScores(updated);
  } catch (error) {
    logger.warn("failed to record chunk outcome", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
