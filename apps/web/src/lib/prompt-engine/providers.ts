import "server-only";

import {
  AiGateway,
  AnthropicClient,
  GatewayLlm,
  MemoryResponseCache,
  MemoryUsageSink,
  OpenAiClient,
  TokenBucketLimiter,
  type ProviderClient,
  type Provider as GatewayProvider,
} from "@beyond-social/ai-gateway";
import {
  CachingEmbedder,
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
import { SupabaseEmbeddingCache, SupabaseResponseCache } from "./shared-cache";
import { SupabaseUsageSink } from "./usage-sink";
import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Constructs the prompt-engine collaborators from server env. Everything is
 * created lazily and memoized so importing this module is free; the objects
 * exist only once enhancement actually runs. Guarded by `isPromptEngineConfigured`.
 */

let embedderRef: CachingEmbedder | null = null;

/**
 * Wrapped in a cache because query embeddings repeat heavily: the same brief
 * retried, the same phrasing across users, the same text on a page refresh.
 * Embeddings are a pure function of (model, text), so a hit is always correct.
 */
export function getEmbedder(): Embedder {
  if (embedderRef) return embedderRef;
  const provider: Embedder = serverEnv.VOYAGE_API_KEY
    ? new VoyageEmbedder(serverEnv.VOYAGE_API_KEY, "voyage-3-large", 1024, "query")
    : new OpenAiEmbedder(serverEnv.OPENAI_API_KEY);

  // Shared across instances when there is a database to share through. The
  // in-process cache is the fallback, not the goal: on serverless it is lost on
  // every cold start, so the hit rate without this is close to zero.
  embedderRef = new CachingEmbedder(
    provider,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY !== ""
      ? new SupabaseEmbeddingCache(provider.model)
      : undefined,
  );
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

/**
 * Every model call goes through the gateway, so routing, retries, cross-provider
 * fallback, rate limiting, and cost accounting apply uniformly. Usage is kept in
 * memory for now; point the sink at a table when the billing layer lands.
 */
export const usageSink: MemoryUsageSink | SupabaseUsageSink = isSupabaseConfigured
  ? new SupabaseUsageSink()
  : new MemoryUsageSink();

/**
 * Deterministic calls (judging, extraction, anything at temperature 0) repeat
 * often and cost the same every time, so they are cached for an hour.
 */
export const responseCache =
  serverEnv.SUPABASE_SERVICE_ROLE_KEY !== ""
    ? new SupabaseResponseCache()
    : new MemoryResponseCache();

let gatewayRef: AiGateway | null = null;

function getGateway(): AiGateway {
  if (gatewayRef) return gatewayRef;
  const clients: Partial<Record<GatewayProvider, ProviderClient>> = {};
  if (serverEnv.ANTHROPIC_API_KEY) {
    clients.anthropic = new AnthropicClient(serverEnv.ANTHROPIC_API_KEY);
  }
  if (serverEnv.OPENAI_API_KEY) {
    clients.openai = new OpenAiClient(serverEnv.OPENAI_API_KEY);
  }
  gatewayRef = new AiGateway({
    clients,
    usage: usageSink,
    cache: responseCache,
    // Everything reaching the gateway from the web app carries user-supplied
    // text, so screening is on. `medium` blocks clear injection attempts while
    // leaving ordinary creative briefs alone.
    safety: { blockInjectionAt: "medium", moderateInput: true, moderateOutput: true },
    // Generous per-user ceiling in estimated input tokens, sized to stop a
    // runaway loop rather than to throttle normal use.
    limiter: new TokenBucketLimiter({ capacity: 120_000, refillPerSec: 400 }),
  });
  return gatewayRef;
}

/** The generation model chain for a task; falls back across providers. */
export function getGenerator(userId?: string): Llm {
  return new GatewayLlm(getGateway(), "generation", userId);
}

/** A cheaper chain for grading and extraction. */
export function getJudge(userId?: string): Llm {
  return new GatewayLlm(getGateway(), "judge", userId);
}

/** System layers referenced by the default recipe, kept in sync with prompts/system. */
export const SYSTEM_LAYERS: ReadonlyMap<string, string> = new Map([
  [
    // Kept in sync with prompts/system/video-director.md.
    "system/video-director",
    [
      "You are the video direction intelligence behind Beyond Social. Turn a brief into a vivid",
      "text-to-video prompt at the level of a working director and DP.",
      "",
      "Decide the shot before writing the prompt; skipping to prose is what produces generic",
      "footage, because every unstated choice falls back to the model's default. In order:",
      "read the intent, choose format and platform, plan the beats, fix the look once (light",
      "direction and quality, time of day, grade) and repeat that clause verbatim in every shot,",
      "pin the subject's identity without paraphrase, then write each prompt as subject, action,",
      "setting, camera, lighting, style.",
      "",
      "Direct with physics, not adjectives: specify only what a camera could observe. Prefer slow,",
      "simple, motivated motion, which is both more cinematic and cleaner to generate. One action",
      "per shot.",
      "",
      "Before returning, check your own output: does every shot name a shot size and a camera",
      "state, is there exactly one action per shot, does the look clause appear in all of them.",
      "Fix what fails before answering.",
    ].join("\n"),
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
    // Worked briefs sit last so the model sees the craft first, then how it is
    // applied end to end. Few-shot exemplars are the strongest single lever on
    // output quality, so they must have their own slot or they never retrieve.
    { name: "Worked examples", categories: ["example"], limit: 2, order: 4, boost: 1.1 },
  ],
  knowledgeTokenBudget: 3500,
  minSimilarity: 0.25,
  mmrLambda: 0.7,
});
