import "server-only";

import { randomUUID } from "node:crypto";

import {
  KnowledgeExtractor,
  KnowledgeMerger,
  LearningPipeline,
  PromptEvaluator,
  SupabaseLearningStore,
  type IngestResult,
  type LearningCandidate,
  type SupabaseRpcClient,
} from "@beyond-social/prompt-engine";

import { isFlagEnabled } from "@/lib/flags";
import { isPromptEngineConfigured } from "@/lib/server-env";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

import { getEmbedder, getJudge, getStore } from "./providers";

let learningStoreRef: SupabaseLearningStore | null = null;

function getStoreForLearning(): SupabaseLearningStore {
  learningStoreRef ??= new SupabaseLearningStore(
    createServiceClient() as unknown as SupabaseRpcClient,
  );
  return learningStoreRef;
}

let pipelineRef: LearningPipeline | null = null;

function getPipeline(): LearningPipeline {
  if (pipelineRef) return pipelineRef;
  const judge = getJudge();
  const embedder = getEmbedder();
  const store = getStore();
  const learningStore = getStoreForLearning();
  pipelineRef = new LearningPipeline({
    evaluator: new PromptEvaluator(judge, embedder, store),
    extractor: new KnowledgeExtractor(judge),
    merger: new KnowledgeMerger(judge),
    embedder,
    store,
    learningStore,
    now: () => new Date().toISOString(),
    newId: () => randomUUID(),
  });
  return pipelineRef;
}

/**
 * Feeds a submitted prompt (and its output) into the learning pipeline, which
 * evaluates, gates, and, if valuable, files a reviewed candidate. Review-by-
 * default, so nothing enters the base automatically. Best-effort: failures are
 * logged, never thrown, and callers should not await it in the critical path.
 */
export async function learnFromPrompt(
  prompt: string,
  output?: string,
): Promise<IngestResult | null> {
  if (!isPromptEngineConfigured) return null;
  try {
    // Auto-promotion defaults to off: letting learned chunks into the base
    // without review is the riskier setting, so it must be chosen explicitly.
    const autoPromote = await isFlagEnabled("learning_autopromote", false);
    return await getPipeline().ingest({
      prompt,
      output,
      policy: { reviewByDefault: !autoPromote },
    });
  } catch (error) {
    logger.warn("learning ingestion failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * The candidates waiting for a human decision.
 *
 * The pipeline gates everything it does not auto-promote into `pending`, and
 * auto-promotion is off by default, so this queue is where learned knowledge
 * actually goes. It had no reader: the pipeline filed candidates that nothing
 * could list, which is a review step that cannot be performed.
 */
export async function pendingCandidates(): Promise<LearningCandidate[]> {
  if (!isPromptEngineConfigured) return [];
  return getStoreForLearning().listCandidates("pending");
}

/**
 * Accepts a candidate into the knowledge base.
 *
 * Promotion is not a status change: a merge candidate is re-resolved against
 * the corpus first, because it was merged against whatever its target looked
 * like at ingest time and the target may have moved on while it waited. That
 * work needs the embedder and the vector store, which is why this lives here
 * rather than in the console.
 */
export async function promoteCandidate(id: string): Promise<void> {
  await getPipeline().promote(id);
}

/** Refuses a candidate, keeping the reason on the audit trail. */
export async function rejectCandidate(id: string, reason: string): Promise<void> {
  await getPipeline().reject(id, reason);
}
