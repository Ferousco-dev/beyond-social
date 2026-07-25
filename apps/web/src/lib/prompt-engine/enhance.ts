import "server-only";

import { composePrompt, generationRequestSchema } from "@beyond-social/prompt-engine";

import { isPromptEngineConfigured } from "@/lib/server-env";
import { logger } from "@/lib/logger";

import { DEFAULT_RECIPE, SYSTEM_LAYERS, getGenerator, getRetriever } from "./providers";

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
  try {
    const request = generationRequestSchema.parse({
      prompt: input.prompt,
      ...(input.platform ? { platform: input.platform } : {}),
      ...(input.productType ? { productType: input.productType } : {}),
    });

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
