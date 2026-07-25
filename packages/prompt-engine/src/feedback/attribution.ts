import type { FeedbackEvent } from "../schema/feedback";
import type { ChunkScore } from "../schema/scoring";
import { applyOutcome, seedScore } from "./scoring";

/**
 * Credit assignment. When an outcome lands, every chunk that was in the prompt's
 * context shares the signal. This is intentionally uniform: without per-chunk
 * causal isolation (which would need counterfactual generations) uniform credit
 * is the unbiased estimator, and the Beta update's conservatism keeps a single
 * event from moving any one chunk much. Chunks the pipeline has never scored are
 * seeded from a neutral prior first so the update is well-defined.
 */
export function attributeFeedback(
  event: FeedbackEvent,
  current: ReadonlyMap<string, ChunkScore>,
): ChunkScore[] {
  return event.chunkIds.map((chunkId) => {
    const existing = current.get(chunkId) ?? seedScore(chunkId, 0.5, event.createdAt);
    return applyOutcome(existing, event.outcome, event.editDistance, event.createdAt);
  });
}
