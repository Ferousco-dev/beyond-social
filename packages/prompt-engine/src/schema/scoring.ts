import { z } from "zod";

/**
 * A chunk's live quality is a Beta posterior over accept/reject outcomes, not a
 * running average. Beta(alpha, beta) starts from the author's prior and updates
 * as feedback arrives; the posterior mean is the score, and its variance gives
 * us calibrated confidence (a chunk seen 3 times is trusted less than one seen
 * 300 times, even at the same mean). This resists cold-start overreaction.
 */
export const chunkScoreSchema = z.object({
  chunkId: z.string().min(1),
  /** Pseudo-count of positive outcomes (prior + accepts + weighted edits). */
  alpha: z.number().positive(),
  /** Pseudo-count of negative outcomes (prior + rejects). */
  beta: z.number().positive(),
  /** Posterior mean = alpha / (alpha + beta). Denormalized for fast ranking. */
  qualityScore: z.number().min(0).max(1),
  /** 1 - normalized posterior variance; higher = more evidence behind score. */
  confidence: z.number().min(0).max(1),
  usageCount: z.number().int().nonnegative(),
  acceptCount: z.number().int().nonnegative(),
  rejectCount: z.number().int().nonnegative(),
  editCount: z.number().int().nonnegative(),
  /** Popularity with time-decay applied, so trends can surface over classics. */
  popularity: z.number().nonnegative(),
  lastUsedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});
export type ChunkScore = z.infer<typeof chunkScoreSchema>;

/** Weights for the retrieval blend. Tunable and versioned as a recipe input. */
export const rankingWeightsSchema = z.object({
  similarity: z.number().default(0.5),
  rerank: z.number().default(0.2),
  quality: z.number().default(0.15),
  confidence: z.number().default(0.05),
  popularity: z.number().default(0.1),
});
export type RankingWeights = z.infer<typeof rankingWeightsSchema>;
