import "server-only";

import {
  AiGateway,
  AnthropicClient,
  GeminiClient,
  GatewayLlm,
  SpendBudget,
  type GatewayAttribution,
  MemoryResponseCache,
  MemoryUsageSink,
  OpenAiClient,
  TieredLimiter,
  TokenBucketLimiter,
  type ProviderClient,
  type Provider as GatewayProvider,
} from "@beyond-social/ai-gateway";
import {
  CachingEmbedder,
  GeminiEmbedder,
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

import { currentAiUser } from "@/lib/ai/request-user";
import { currentTrace } from "@/lib/observability/trace";
import { logger } from "@/lib/logger";
import { SupabaseRateLimiter } from "@/lib/ai/shared-limiter";
import { SupabaseSpendReader } from "@/lib/ai/spend-reader";
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
  // Voyage first on retrieval quality, then OpenAI, then Gemini. Whichever is
  // used, `query` encoding is asymmetric with the `document` encoding used at
  // ingest, which is what the two sides of a retrieval are supposed to be.
  const provider: Embedder = serverEnv.VOYAGE_API_KEY
    ? new VoyageEmbedder(serverEnv.VOYAGE_API_KEY, "voyage-3-large", 1024, "query")
    : serverEnv.OPENAI_API_KEY
      ? new OpenAiEmbedder(serverEnv.OPENAI_API_KEY)
      : // Deliberately no model or width override. This call site pinned
        // `text-embedding-004` at 768, which is wrong twice: that model was
        // retired and returns 404, and 768 does not fit the vector(1024) column
        // it would be written to. The class defaults are the working pair.
        new GeminiEmbedder(serverEnv.GEMINI_API_KEY, undefined, undefined, "RETRIEVAL_QUERY");

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
  if (serverEnv.GEMINI_API_KEY) {
    clients.google = new GeminiClient(serverEnv.GEMINI_API_KEY);
  }
  gatewayRef = new AiGateway({
    clients,
    usage: usageSink,
    cache: responseCache,
    // Everything reaching the gateway from the web app carries user-supplied
    // text, so screening is on. `medium` blocks clear injection attempts while
    // leaving ordinary creative briefs alone.
    safety: { blockInjectionAt: "medium", moderateInput: true, moderateOutput: true },
    /*
     * Two tiers, because they fail differently.
     *
     * The token bucket is in-process: free, instant, and weighted by prompt
     * size, so it stops a runaway loop before anything leaves the process. It is
     * also per instance, which on serverless means a fleet of ten enforces ten
     * times the limit and a cold start resets it.
     *
     * The shared counter is the one that holds across instances, and is the only
     * one that can express "this many an hour" as a real number.
     */
    /*
     * The shared limit counts gateway calls, and one message costs four or five
     * of them: classify, enhance, reply, extract a memory, refresh a summary. At
     * 120 an hour that read as a generous ceiling and behaved like roughly
     * twenty-five messages, which is a limit on the product rather than on
     * abuse.
     *
     * A shorter window matters as much as the number. An hour means a person who
     * hits the ceiling is locked out for up to an hour with no way to tell how
     * long is left; ten minutes bounds the wait to something a person will
     * simply wait out.
     */
    limiter: new TieredLimiter([
      new TokenBucketLimiter({ capacity: 120_000, refillPerSec: 400 }),
      new SupabaseRateLimiter({ bucket: "ai", limit: 150, windowSeconds: 600 }),
    ]),
    /*
     * Usage rows, cache writes and limiter settlement all run beside the
     * response so they cannot slow a call that has already been paid for. That
     * makes their failures silent unless something listens: a usage sink that
     * has been rejecting every insert for a week looks exactly like a quiet
     * week, and the cost dashboard reads as an empty one.
     */
    onError: (source, error) => {
      logger.warn("ai gateway bookkeeping failed", {
        source,
        error: error instanceof Error ? error.message : String(error),
      });
    },
    /*
     * A ceiling on spend, which the limiter cannot express.
     *
     * Requests and prompt tokens are not what the invoice is denominated in: a
     * few long calls to an expensive model cost more than a flood of cheap
     * ones. Needs a database to read spend from, so without one there is
     * nothing to enforce against and the ceiling is simply absent.
     */
    ...(serverEnv.AI_SPEND_LIMIT_USD > 0 && serverEnv.SUPABASE_SERVICE_ROLE_KEY !== ""
      ? {
          budget: new SpendBudget({
            reader: new SupabaseSpendReader(),
            limitUsd: serverEnv.AI_SPEND_LIMIT_USD,
            windowMs: serverEnv.AI_SPEND_WINDOW_HOURS * 60 * 60 * 1000,
            onReadError: (key, error) => {
              logger.warn("ai spend ceiling could not read usage", {
                key,
                error: error instanceof Error ? error.message : String(error),
              });
            },
          }),
        }
      : {}),
  });
  return gatewayRef;
}

/*
 * Each accessor defaults to the user the current request belongs to.
 *
 * Every call site reached these with no argument, so the rate limit keyed on
 * `anonymous` and one bucket was shared by the whole platform. Defaulting here
 * fixes every caller at once, and an explicit id still wins for the cases that
 * have one to hand.
 */

/**
 * Attribution for one call: who it is for, and what it is part of.
 *
 * The trace id comes from the request context the logger already reads, so a
 * row in `ai_usage` and the log lines around it carry the same id. One chat
 * message fans out into four or five model calls, and this is what lets them
 * be added up as the message rather than read as five unrelated charges.
 */
function attribution(userId: string | undefined): GatewayAttribution {
  const traceId = currentTrace()?.traceId;
  return {
    ...(userId === undefined ? {} : { userId }),
    ...(traceId === undefined ? {} : { traceId }),
  };
}

/** The generation model chain for a task; falls back across providers. */
export function getGenerator(userId: string | undefined = currentAiUser()): Llm {
  return new GatewayLlm(getGateway(), "generation", attribution(userId));
}

/** A cheaper chain for grading and extraction. */
export function getJudge(userId: string | undefined = currentAiUser()): Llm {
  return new GatewayLlm(getGateway(), "judge", attribution(userId));
}

/**
 * The chain for talking to the user.
 *
 * Separate from `generation` because the two optimise for different things: a
 * directed video prompt is worth waiting on, a two-sentence reply is not.
 */
export function getChat(userId: string | undefined = currentAiUser()): Llm {
  return new GatewayLlm(getGateway(), "chat", attribution(userId));
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
