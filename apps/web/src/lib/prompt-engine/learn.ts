import "server-only";

import { randomUUID } from "node:crypto";

import {
  KnowledgeExtractor,
  KnowledgeMerger,
  LearningPipeline,
  PromptEvaluator,
  SupabaseLearningStore,
  type IngestResult,
  type SupabaseRpcClient,
} from "@beyond-social/prompt-engine";

import { isPromptEngineConfigured } from "@/lib/server-env";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

import { getEmbedder, getJudge, getStore } from "./providers";

let pipelineRef: LearningPipeline | null = null;

function getPipeline(): LearningPipeline {
  if (pipelineRef) return pipelineRef;
  const judge = getJudge();
  const embedder = getEmbedder();
  const store = getStore();
  const learningStore = new SupabaseLearningStore(
    createServiceClient() as unknown as SupabaseRpcClient,
  );
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
    return await getPipeline().ingest({ prompt, output });
  } catch (error) {
    logger.warn("learning ingestion failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
