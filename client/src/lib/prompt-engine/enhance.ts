import "server-only";

import { composePrompt, generationRequestSchema } from "@beyond-social/prompt-engine";

import { isFlagEnabled } from "@/lib/flags";
import { isPromptEngineConfigured } from "@/lib/server-env";
import { logger } from "@/lib/logger";

import { currentAiUser } from "@/lib/ai/request-user";

import {
  DEFAULT_RECIPE,
  SYSTEM_LAYERS,
  getGenerator,
  getPromptEngine,
  getRetriever,
} from "./providers";

export interface EnhanceInput {
  prompt: string;
  platform?: string;
  productType?: string;
}

export interface EnhancedPrompt {
  text: string;
  chunkIds: string[];
}

const REWRITE_INSTRUCTION =
  "\n\nUsing the retrieved knowledge, rewrite the task into ONE vivid text-to-video prompt " +
  "(subject, action, setting, camera, lighting, style). Be specific and physical. Output only the prompt.";

/**
 * Enhances a raw user prompt into a knowledge-grounded, senior-quality video
 * prompt via the RAG engine. Returns null when the engine is not configured or
 * anything fails, so generation always proceeds on the original prompt: the
 * engine improves output but is never a point of failure in the critical path.
 */
export async function enhancePrompt(input: EnhanceInput): Promise<EnhancedPrompt | null> {
  if (!isPromptEngineConfigured) return null;
  // Kill switch: turning this off in the admin console falls back to the raw
  // prompt without a deploy. Defaults to on, so a flag outage does not silently
  // disable the engine.
  if (!(await isFlagEnabled("prompt_engine", true))) return null;

  try {
    const request = generationRequestSchema.parse({
      prompt: input.prompt,
      ...(input.platform ? { platform: input.platform } : {}),
      ...(input.productType ? { productType: input.productType } : {}),
    });

    /*
     * Grade the prompt and revise it once if it falls short.
     *
     * The engine that does this was written, bounded and then never called: the
     * app reached past it to compose and complete directly, so a prompt was
     * whatever came back first. That is the wrong place to save a judge call.
     * This prompt is about to be turned into a video that costs credits and
     * minutes, and a second opinion costs a fraction of a cent against a render
     * nobody wanted.
     *
     * Off by flag rather than by deploy, since it is the one change here that
     * adds latency to the critical path of starting a generation.
     */
    if (await isFlagEnabled("prompt_engine_critic", true)) {
      const result = await getPromptEngine().generate(
        currentAiUser() ?? "anonymous",
        request,
        DEFAULT_RECIPE,
        { instruction: REWRITE_INSTRUCTION, temperature: 0.7, maxTokens: 500 },
      );
      const revised = result.output.trim();
      if (revised !== "") {
        logger.info("prompt enhanced", {
          regenerations: result.regenerations,
          score: result.evaluation?.overall ?? null,
          passed: result.evaluation?.passed ?? null,
        });
        return { text: revised, chunkIds: result.composed.chunkRefs.map((ref) => ref.id) };
      }
      // An empty output falls through to the single-shot path rather than to
      // the raw prompt: the retrieval has already been paid for.
    }

    const retrieval = await getRetriever().retrieve(request, DEFAULT_RECIPE);
    const composed = composePrompt(request, DEFAULT_RECIPE, retrieval, SYSTEM_LAYERS);

    const output = await getGenerator().complete({
      system: composed.system,
      messages: [{ role: "user", content: composed.user + REWRITE_INSTRUCTION }],
      temperature: 0.7,
      maxTokens: 500,
    });

    const text = output.trim();
    if (text === "") return null;
    return { text, chunkIds: composed.chunkRefs.map((ref) => ref.id) };
  } catch (error) {
    logger.warn("prompt enhancement failed; using raw prompt", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
