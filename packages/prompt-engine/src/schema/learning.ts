import { z } from "zod";

import { chunkFrontmatterSchema } from "./chunk";

/**
 * The prompt-learning subsystem: it decides whether a submitted prompt (and its
 * outcome) contains knowledge worth keeping, and if so how to fold it into the
 * base without polluting it. This file is the single source of truth for its
 * types; the pipeline, evaluator, and storage all speak these.
 */

/** The dimensions a prompt is scored on. Mix of subjective (LLM-judged) and
 * objective (programmatically measured) signals. */
export const LEARNING_DIMENSIONS = [
  "originality",
  "reusability",
  "specificity",
  "clarity",
  "informationDensity",
  "domainRelevance",
  "novelty",
  "longTermValue",
  "frequency",
  "outcomeQuality",
] as const;

export const learningDimensionSchema = z.enum(LEARNING_DIMENSIONS);
export type LearningDimension = z.infer<typeof learningDimensionSchema>;

export const dimensionSignalSchema = z.object({
  dimension: learningDimensionSchema,
  score: z.number().min(0).max(1),
  /** How this score was produced, for auditability. */
  source: z.enum(["llm", "programmatic"]),
  rationale: z.string(),
});
export type DimensionSignal = z.infer<typeof dimensionSignalSchema>;

/**
 * What to do with a prompt's knowledge. A spectrum, not yes/no: discard noise,
 * create a genuinely new chunk, merge/update into a near-duplicate, or hold for
 * human review when the signal is real but uncertain.
 */
export const learningDecisionSchema = z.enum(["discard", "new_chunk", "merge"]);
export type LearningDecision = z.infer<typeof learningDecisionSchema>;

export const promptEvaluationSchema = z.object({
  dimensions: z.array(dimensionSignalSchema),
  /** Weighted aggregate of the dimensions, 0..1. */
  overall: z.number().min(0).max(1),
  /** Trust in this evaluation (evidence volume + judge/heuristic agreement). */
  confidence: z.number().min(0).max(1),
  decision: learningDecisionSchema,
  /** Human-readable explanation of why the prompt was accepted/rejected. */
  decisionReason: z.string(),
  /** Max cosine similarity to any existing active chunk, 0..1. */
  maxSimilarity: z.number().min(0).max(1).nullable(),
  nearestChunkId: z.string().nullable(),
  spam: z.boolean(),
  evaluatedAt: z.string().datetime(),
});
export type PromptEvaluation = z.infer<typeof promptEvaluationSchema>;

/** A draft chunk extracted from a valuable prompt, pre-ingest. */
export const draftChunkSchema = chunkFrontmatterSchema.extend({
  body: z.string().min(1),
});
export type DraftChunk = z.infer<typeof draftChunkSchema>;

export const candidateStatusSchema = z.enum(["pending", "promoted", "rejected", "merged"]);
export type CandidateStatus = z.infer<typeof candidateStatusSchema>;

/** A candidate awaiting the gate/review before it can enter the base. */
export const learningCandidateSchema = z.object({
  id: z.string().min(1),
  draft: draftChunkSchema,
  status: candidateStatusSchema,
  evaluation: promptEvaluationSchema,
  /** Set when the decision is merge/update: the existing chunk to fold into. */
  targetChunkId: z.string().nullable(),
  /** Opaque reference to the source generation/prompt, for provenance. */
  sourceRef: z.string().nullable(),
  workspaceId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LearningCandidate = z.infer<typeof learningCandidateSchema>;

export const auditActionSchema = z.enum([
  "evaluate",
  "create_candidate",
  "promote",
  "reject",
  "merge",
  "update",
  "deprecate",
  "version",
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

/** One immutable audit record. Every change to the base leaves one. */
export const auditEntrySchema = z.object({
  id: z.string().min(1),
  action: auditActionSchema,
  chunkId: z.string().nullable(),
  candidateId: z.string().nullable(),
  actor: z.enum(["system", "user", "reviewer"]),
  reason: z.string(),
  meta: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

/** Tunable thresholds governing the gate. Versioned alongside recipes. */
export const learningPolicySchema = z.object({
  /** Below this overall score, discard as low value. */
  discardBelow: z.number().min(0).max(1).default(0.45),
  /** At/above this similarity a candidate targets an existing chunk. */
  mergeSimilarity: z.number().min(0).max(1).default(0.82),
  /** At/above this similarity with low novelty, discard as duplicate. */
  duplicateSimilarity: z.number().min(0).max(1).default(0.93),
  /** Overall AND confidence at/above this may auto-promote without review. */
  autoPromoteAbove: z.number().min(0).max(1).default(0.85),
  /** When true, everything not auto-promoted or discarded waits for review. */
  reviewByDefault: z.boolean().default(true),
});
export type LearningPolicy = z.infer<typeof learningPolicySchema>;

export const DIMENSION_WEIGHTS: Record<LearningDimension, number> = {
  originality: 1,
  reusability: 1.4,
  specificity: 1.1,
  clarity: 0.9,
  informationDensity: 0.9,
  domainRelevance: 1.2,
  novelty: 1.3,
  longTermValue: 1.4,
  frequency: 0.8,
  outcomeQuality: 1.3,
};
