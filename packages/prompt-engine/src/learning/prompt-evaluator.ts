import type { Embedder, Llm, VectorStore } from "../ports";
import {
  DIMENSION_WEIGHTS,
  learningDimensionSchema,
  type DimensionSignal,
  type LearningPolicy,
  type PromptEvaluation,
} from "../schema/learning";
import { z } from "zod";
import { clarityScore, detectSpam, informationDensityScore, specificityScore } from "./signals";

/** Dimensions the LLM judges; the rest are measured programmatically. */
const JUDGED = [
  "originality",
  "reusability",
  "domainRelevance",
  "novelty",
  "longTermValue",
] as const;

const judgeSchema = z.object({
  scores: z.array(
    z.object({
      dimension: learningDimensionSchema,
      score: z.number().min(0).max(1),
      rationale: z.string(),
    }),
  ),
});

export interface EvaluationContext {
  /** How often prompts like this are seen, 0..1 (from analytics if available). */
  frequencyHint?: number;
  /** Quality of the generation this prompt produced, 0..1, if known. */
  outcomeScore?: number;
}

/**
 * Scores a submitted prompt across ten dimensions and decides its fate. Cheap
 * deterministic signals gate obvious noise first; an LLM judges the subjective
 * dimensions; corpus similarity decides new-vs-merge-vs-duplicate. The output is
 * a full, explainable evaluation, never a bare yes/no.
 */
export class PromptEvaluator {
  constructor(
    private readonly judge: Llm,
    private readonly embedder: Embedder,
    private readonly store: VectorStore,
  ) {}

  async evaluate(
    prompt: string,
    ctx: EvaluationContext,
    policy: LearningPolicy,
    now: string,
  ): Promise<PromptEvaluation> {
    const spam = detectSpam(prompt);
    if (spam.isSpam) {
      return this.terminal("discard", `Rejected as noise: ${spam.reasons.join("; ")}.`, now, true);
    }

    const [embedding] = await this.embedder.embed([prompt]);
    const similar = embedding
      ? await this.store.search({ embedding, text: prompt, limit: 1, minSimilarity: 0 })
      : [];
    const nearest = similar[0];
    const maxSimilarity = nearest?.similarity ?? null;

    const programmatic = this.programmaticDimensions(prompt, ctx);
    const judged = await this.judgedDimensions(prompt);
    const dimensions = [...programmatic, ...adjustNovelty(judged, maxSimilarity)];

    const overall = weightedOverall(dimensions);
    const confidence = this.confidence(dimensions, maxSimilarity);
    const { decision, reason } = decide(overall, dimensions, maxSimilarity, policy);

    return {
      dimensions,
      overall,
      confidence,
      decision,
      decisionReason: reason,
      maxSimilarity,
      nearestChunkId: decision === "merge" ? (nearest?.chunk.id ?? null) : null,
      spam: false,
      evaluatedAt: now,
    };
  }

  private programmaticDimensions(prompt: string, ctx: EvaluationContext): DimensionSignal[] {
    const p = (
      dimension: DimensionSignal["dimension"],
      score: number,
      rationale: string,
    ): DimensionSignal => ({
      dimension,
      score,
      source: "programmatic",
      rationale,
    });
    return [
      p("specificity", specificityScore(prompt), "concreteness of nouns, numbers, and detail"),
      p("clarity", clarityScore(prompt), "sentence structure and readability"),
      p("informationDensity", informationDensityScore(prompt), "unique-token ratio and length"),
      p("frequency", ctx.frequencyHint ?? 0.4, "how often similar prompts occur"),
      p("outcomeQuality", ctx.outcomeScore ?? 0.5, "quality of the generation it produced"),
    ];
  }

  private async judgedDimensions(prompt: string): Promise<DimensionSignal[]> {
    const raw = await this.judge.complete({
      system: "You grade whether a prompt contains reusable knowledge. Output strict JSON only.",
      messages: [{ role: "user", content: buildJudgePrompt(prompt) }],
      temperature: 0,
      json: true,
    });
    const parsed = judgeSchema.parse(safeJson(raw));
    const byDimension = new Map(parsed.scores.map((s) => [s.dimension, s]));
    return JUDGED.map((dimension) => {
      const s = byDimension.get(dimension);
      return {
        dimension,
        score: s?.score ?? 0.5,
        source: "llm" as const,
        rationale: s?.rationale ?? "not scored",
      };
    });
  }

  private confidence(dimensions: readonly DimensionSignal[], maxSimilarity: number | null): number {
    // More evidence (a similarity signal) and less internal disagreement -> more
    // confidence. Variance across dimensions lowers it.
    const scores = dimensions.map((d) => d.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length;
    const evidence = maxSimilarity === null ? 0.5 : 0.7;
    return Math.max(0, Math.min(1, evidence + 0.3 * (1 - variance * 4)));
  }

  private terminal(
    decision: PromptEvaluation["decision"],
    reason: string,
    now: string,
    spam: boolean,
  ): PromptEvaluation {
    return {
      dimensions: [],
      overall: 0,
      confidence: 0.9,
      decision,
      decisionReason: reason,
      maxSimilarity: null,
      nearestChunkId: null,
      spam,
      evaluatedAt: now,
    };
  }
}

function weightedOverall(dimensions: readonly DimensionSignal[]): number {
  let sum = 0;
  let weight = 0;
  for (const d of dimensions) {
    const w = DIMENSION_WEIGHTS[d.dimension];
    sum += w * d.score;
    weight += w;
  }
  return weight === 0 ? 0 : sum / weight;
}

/** High similarity to an existing chunk caps how novel the new one can be. */
function adjustNovelty(
  dimensions: DimensionSignal[],
  maxSimilarity: number | null,
): DimensionSignal[] {
  if (maxSimilarity === null) return dimensions;
  return dimensions.map((d) =>
    d.dimension === "novelty"
      ? {
          ...d,
          score: Math.min(d.score, 1 - maxSimilarity),
          rationale: `${d.rationale} (capped by similarity ${maxSimilarity.toFixed(2)})`,
        }
      : d,
  );
}

function decide(
  overall: number,
  dimensions: readonly DimensionSignal[],
  maxSimilarity: number | null,
  policy: LearningPolicy,
): { decision: PromptEvaluation["decision"]; reason: string } {
  const novelty = dimensions.find((d) => d.dimension === "novelty")?.score ?? 0.5;
  if (overall < policy.discardBelow) {
    return {
      decision: "discard",
      reason: `Overall value ${overall.toFixed(2)} below threshold ${policy.discardBelow}.`,
    };
  }
  if (maxSimilarity !== null && maxSimilarity >= policy.duplicateSimilarity && novelty < 0.25) {
    return {
      decision: "discard",
      reason: `Near-duplicate (similarity ${maxSimilarity.toFixed(2)}) with little new information.`,
    };
  }
  if (maxSimilarity !== null && maxSimilarity >= policy.mergeSimilarity) {
    return {
      decision: "merge",
      reason: `Overlaps existing knowledge (similarity ${maxSimilarity.toFixed(2)}); fold in rather than duplicate.`,
    };
  }
  return {
    decision: "new_chunk",
    reason: `Novel, reusable knowledge (value ${overall.toFixed(2)}).`,
  };
}

function buildJudgePrompt(prompt: string): string {
  return [
    "Score the PROMPT on each dimension from 0 to 1 for whether it contains",
    "durable, reusable design/video knowledge (not one-off user requests).",
    "Dimensions: originality, reusability, domainRelevance, novelty, longTermValue.",
    "Reward generalizable craft; penalize purely personal, one-off asks.",
    "",
    "PROMPT:",
    prompt,
    "",
    'Return JSON: {"scores":[{"dimension","score","rationale"}]}',
  ].join("\n");
}

function safeJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Evaluator judge did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}
