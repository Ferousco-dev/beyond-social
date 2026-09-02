import { z } from "zod";

import { chunkCategorySchema } from "./chunk";
import { evalPolicySchema } from "./evaluation";
import { rankingWeightsSchema } from "./scoring";

/**
 * A recipe is a versioned composition strategy: it says which knowledge to
 * retrieve, how much of it, how to rank and budget it, and how to evaluate the
 * result. Recipes are authored (under `prompts/templates/`) and referenced by
 * id+version on every generation record, so any output is fully reproducible.
 */

/** One retrieval slot: pull up to `limit` chunks from these categories. */
export const retrievalSlotSchema = z.object({
  name: z.string().min(1),
  categories: z.array(chunkCategorySchema).min(1),
  limit: z.number().int().positive().max(50),
  /** Slots are assembled in ascending order; lower = earlier in the prompt. */
  order: z.number().int().nonnegative(),
  /*
   * There was a `boost` here, a per-slot multiplier "applied during ranking".
   * Nothing applied it. `assignToSlots` and `rankCandidates` never read the
   * field, so the two recipes that set it, Foundations at 1.15 and Worked
   * examples at 1.1, were expressing a preference that has never once affected
   * what was retrieved.
   *
   * Removed rather than implemented. Implementing it changes what every
   * generation retrieves, which is a ranking change that wants measuring
   * against the golden queries rather than being switched on because a field
   * happened to exist. A setting that silently does nothing is worse than no
   * setting: somebody tuned these numbers and believed them.
   */
});
export type RetrievalSlot = z.infer<typeof retrievalSlotSchema>;

export const recipeSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  description: z.string().default(""),
  /** Ids of base system-layer prompts (personas, guardrails) to prepend. */
  systemLayers: z.array(z.string()).default([]),
  slots: z.array(retrievalSlotSchema).min(1),
  weights: rankingWeightsSchema.default({}),
  /** Total token budget for retrieved knowledge (excludes system + task). */
  knowledgeTokenBudget: z.number().int().positive().default(3000),
  /** Minimum cosine similarity to keep a candidate at all. */
  minSimilarity: z.number().min(0).max(1).default(0.2),
  /** MMR trade-off: 1 = pure relevance, 0 = pure diversity. */
  mmrLambda: z.number().min(0).max(1).default(0.7),
  evalPolicy: evalPolicySchema.default({}),
});
export type Recipe = z.infer<typeof recipeSchema>;
