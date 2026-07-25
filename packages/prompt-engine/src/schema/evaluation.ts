import { z } from "zod";

/**
 * The evaluation rubric. Each dimension is scored 0..1 by an LLM judge (with
 * programmatic checks feeding in where they exist, e.g. contrast ratios). The
 * gate blocks or regenerates outputs whose weighted score is below threshold.
 */
export const EVAL_DIMENSIONS = [
  "brandingConsistency",
  "accessibility",
  "spacing",
  "typography",
  "hierarchy",
  "creativity",
  "originality",
  "usability",
  "responsiveness",
  "productQuality",
  "consistency",
] as const;

export const evalDimensionSchema = z.enum(EVAL_DIMENSIONS);
export type EvalDimension = z.infer<typeof evalDimensionSchema>;

export const dimensionScoreSchema = z.object({
  dimension: evalDimensionSchema,
  score: z.number().min(0).max(1),
  /** One-line justification; retained so low scores are actionable, not opaque. */
  rationale: z.string(),
});
export type DimensionScore = z.infer<typeof dimensionScoreSchema>;

export const evaluationSchema = z.object({
  generationId: z.string().min(1),
  dimensions: z.array(dimensionScoreSchema),
  /** Weighted aggregate across dimensions, 0..1. */
  overall: z.number().min(0).max(1),
  passed: z.boolean(),
  /** Concrete, prioritized fixes the generator can act on if it regenerates. */
  suggestions: z.array(z.string()).default([]),
  judgeModel: z.string(),
  createdAt: z.string().datetime(),
});
export type Evaluation = z.infer<typeof evaluationSchema>;

/** Per-dimension weights and the pass threshold. Versioned with the recipe. */
export const evalPolicySchema = z.object({
  weights: z.record(evalDimensionSchema, z.number()).default({}),
  threshold: z.number().min(0).max(1).default(0.75),
  /** Hard-fail dimensions: any below this floor fails regardless of aggregate. */
  floors: z.record(evalDimensionSchema, z.number()).default({}),
  maxRegenerations: z.number().int().nonnegative().default(1),
});
export type EvalPolicy = z.infer<typeof evalPolicySchema>;
