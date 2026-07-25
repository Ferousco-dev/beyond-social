import "server-only";

import {
  ClaudeLlm,
  OpenAiEmbedder,
  PassthroughReranker,
  Retriever,
  SupabaseVectorStore,
  VoyageEmbedder,
  recipeSchema,
  type Embedder,
  type Llm,
  type Recipe,
  type SupabaseRpcClient,
  type VectorStore,
} from "@beyond-social/prompt-engine";

import { serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Constructs the prompt-engine collaborators from server env. Everything is
 * created lazily and memoized so importing this module is free; the objects
 * exist only once enhancement actually runs. Guarded by `isPromptEngineConfigured`.
 */

let embedderRef: Embedder | null = null;
export function getEmbedder(): Embedder {
  if (embedderRef) return embedderRef;
  embedderRef = serverEnv.VOYAGE_API_KEY
    ? new VoyageEmbedder(serverEnv.VOYAGE_API_KEY, "voyage-3-large", 1024, "query")
    : new OpenAiEmbedder(serverEnv.OPENAI_API_KEY);
  return embedderRef;
}

let storeRef: VectorStore | null = null;
export function getStore(): VectorStore {
  if (storeRef) return storeRef;
  // The typed supabase client structurally satisfies the rpc-only port.
  const client = createServiceClient() as unknown as SupabaseRpcClient;
  storeRef = new SupabaseVectorStore(client);
  return storeRef;
}

let retrieverRef: Retriever | null = null;
export function getRetriever(): Retriever {
  retrieverRef ??= new Retriever(getEmbedder(), getStore(), new PassthroughReranker());
  return retrieverRef;
}

/** The generator (default latest Opus) and a cheaper judge (Sonnet). */
export function getGenerator(): Llm {
  return new ClaudeLlm(serverEnv.ANTHROPIC_API_KEY, "claude-opus-4-8");
}

/** System layers referenced by the default recipe, kept in sync with prompts/system. */
export const SYSTEM_LAYERS: ReadonlyMap<string, string> = new Map([
  [
    "system/video-director",
    "You are the video direction intelligence behind Beyond Social. Turn a brief into a vivid text-to-video prompt at the level of a working director and DP. Direct with physics, not adjectives; specify subject, action, setting, camera, lighting, and style. Prefer slow, simple, motivated motion.",
  ],
  [
    "system/guardrails",
    "Meet accessibility and brand constraints. Do not fabricate imagery or invent brand assets. Stay within the target platform's conventions.",
  ],
]);

/** The default composition strategy for video enhancement. */
export const DEFAULT_RECIPE: Recipe = recipeSchema.parse({
  id: "video-generation",
  version: 1,
  systemLayers: ["system/video-director", "system/guardrails"],
  slots: [
    {
      name: "Foundations",
      categories: ["video-prompting", "narrative", "short-form"],
      limit: 4,
      order: 0,
      boost: 1.15,
    },
    {
      name: "Cinematography",
      categories: ["cinematography", "camera-movement", "lighting", "color-grading"],
      limit: 5,
      order: 1,
    },
    { name: "Style and format", categories: ["video-style", "video-pattern"], limit: 3, order: 2 },
    { name: "Quality", categories: ["platform-format", "video-quality"], limit: 2, order: 3 },
  ],
  knowledgeTokenBudget: 3500,
  minSimilarity: 0.25,
  mmrLambda: 0.7,
});
