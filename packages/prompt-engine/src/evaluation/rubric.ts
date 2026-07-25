import { z } from "zod";

import {
  EVAL_DIMENSIONS,
  evalDimensionSchema,
  type DimensionScore,
  type EvalPolicy,
} from "../schema/evaluation";

/** Shape we force the judge LLM to return. Validated before we trust it. */
export const judgeResponseSchema = z.object({
  dimensions: z.array(
    z.object({
      dimension: evalDimensionSchema,
      score: z.number().min(0).max(1),
      rationale: z.string(),
    }),
  ),
  suggestions: z.array(z.string()).default([]),
});
export type JudgeResponse = z.infer<typeof judgeResponseSchema>;

const DIMENSION_GUIDE: Record<(typeof EVAL_DIMENSIONS)[number], string> = {
  brandingConsistency: "adherence to the brand's tokens, voice, and system",
  accessibility: "contrast, focus states, labels, hit targets, keyboard support",
  spacing: "consistent rhythm and use of a spacing scale",
  typography: "type scale, hierarchy, line length, pairing",
  hierarchy: "clear primary/secondary emphasis and scan path",
  creativity: "non-obvious, fresh solutions within constraints",
  originality: "avoids generic AI-template look",
  usability: "clarity of actions, affordances, error prevention",
  responsiveness: "graceful behavior across breakpoints",
  productQuality: "feels like a senior team shipped it",
  consistency: "internal coherence across the output",
};

/**
 * The judge prompt. We ask for per-dimension scores with a one-line rationale
 * each, plus concrete fixes. Requiring rationale forces the model to justify low
 * scores, which both improves calibration and gives the regeneration step
 * something actionable. The aggregate and pass/fail are computed by us, not the
 * model, so the policy stays authoritative and reproducible.
 */
export function buildJudgePrompt(output: string, brief: string): string {
  const guide = EVAL_DIMENSIONS.map((d) => `- ${d}: ${DIMENSION_GUIDE[d]}`).join("\n");
  return [
    "You are a principal design critic. Score the OUTPUT against the BRIEF on each",
    "dimension from 0 (poor) to 1 (excellent). Be exacting; reserve >0.9 for",
    "genuinely senior work. Return strict JSON matching the schema.",
    "",
    "Dimensions:",
    guide,
    "",
    "# BRIEF",
    brief,
    "",
    "# OUTPUT",
    output,
    "",
    'Return JSON: {"dimensions":[{"dimension","score","rationale"}],"suggestions":[]}',
  ].join("\n");
}

/** Weighted aggregate; unspecified weights default to equal weighting. */
export function computeOverall(dimensions: readonly DimensionScore[], policy: EvalPolicy): number {
  if (dimensions.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const d of dimensions) {
    const weight = policy.weights[d.dimension] ?? 1;
    weightedSum += weight * d.score;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

/** Pass requires the aggregate over threshold AND every floored dimension met. */
export function passesPolicy(
  dimensions: readonly DimensionScore[],
  overall: number,
  policy: EvalPolicy,
): boolean {
  if (overall < policy.threshold) return false;
  for (const d of dimensions) {
    const floor = policy.floors[d.dimension];
    if (floor !== undefined && d.score < floor) return false;
  }
  return true;
}
