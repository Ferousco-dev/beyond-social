import { z } from "zod";

import { platformSchema, productTypeSchema } from "./chunk";

/**
 * The generation request, normalized into a retrieval query. This is the input
 * the engine turns into knowledge lookups; recording it lets us replay and
 * evaluate retrieval offline.
 */
export const generationRequestSchema = z.object({
  prompt: z.string().min(1).max(8000),
  productType: productTypeSchema.optional(),
  platform: platformSchema.optional(),
  styles: z.array(z.string()).default([]),
  brandId: z.string().optional(),
  /** Free-form section hints, e.g. ["hero", "pricing"], boost matching chunks. */
  sections: z.array(z.string()).default([]),
});
export type GenerationRequest = z.infer<typeof generationRequestSchema>;

/** What the user did with an output. The signal that trains the knowledge base. */
export const outcomeSchema = z.enum(["accepted", "rejected", "edited", "regenerated"]);
export type Outcome = z.infer<typeof outcomeSchema>;

/**
 * One recorded generation: the request, the exact recipe + chunk versions used
 * (for reproducibility), and the outcome once known. Feedback attribution reads
 * these to credit or blame the chunks that were in context.
 */
export const generationRecordSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  request: generationRequestSchema,
  recipeId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  /** Chunk ids and versions that were actually assembled into the prompt. */
  retrievedChunks: z.array(z.object({ id: z.string(), version: z.number().int() })),
  llmModel: z.string(),
  outputRef: z.string().nullable(),
  outcome: outcomeSchema.nullable(),
  /** Fraction of the output the user changed, 0..1; drives edit-learning. */
  editDistance: z.number().min(0).max(1).nullable(),
  evaluationScore: z.number().min(0).max(1).nullable(),
  createdAt: z.string().datetime(),
});
export type GenerationRecord = z.infer<typeof generationRecordSchema>;

/**
 * A feedback event applied to the score of every chunk that was in context.
 * Edits count as partial-positive scaled by how little was changed.
 */
export const feedbackEventSchema = z.object({
  generationId: z.string().min(1),
  outcome: outcomeSchema,
  editDistance: z.number().min(0).max(1).nullable(),
  chunkIds: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type FeedbackEvent = z.infer<typeof feedbackEventSchema>;
