/**
 * The model registry: the gateway's map of what it can call, what each costs,
 * and what each is good for. Routing, cost accounting, and context-window
 * checks all read from here, so adding a provider is a data change rather than
 * a code change.
 *
 * Prices are US dollars per million tokens. They change; keep them here so
 * there is exactly one place to correct.
 */

export const PROVIDERS = ["anthropic", "openai", "google", "local"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** What a call is for. Routing picks a chain per task. */
export const TASKS = ["generation", "judge", "extraction", "cheap"] as const;
export type Task = (typeof TASKS)[number];

export interface ModelSpec {
  readonly id: string;
  readonly provider: Provider;
  /** USD per million input tokens. */
  readonly inputPerMillion: number;
  /** USD per million output tokens. */
  readonly outputPerMillion: number;
  readonly contextWindow: number;
  readonly maxOutput: number;
  /** Native strict-JSON support, as opposed to prompt-enforced JSON. */
  readonly jsonMode: boolean;
}

export const MODELS: Readonly<Record<string, ModelSpec>> = {
  "claude-opus-4-8": {
    id: "claude-opus-4-8",
    provider: "anthropic",
    inputPerMillion: 15,
    outputPerMillion: 75,
    contextWindow: 200_000,
    maxOutput: 32_000,
    jsonMode: false,
  },
  "claude-sonnet-5": {
    id: "claude-sonnet-5",
    provider: "anthropic",
    inputPerMillion: 3,
    outputPerMillion: 15,
    contextWindow: 200_000,
    maxOutput: 64_000,
    jsonMode: false,
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    inputPerMillion: 1,
    outputPerMillion: 5,
    contextWindow: 200_000,
    maxOutput: 32_000,
    jsonMode: false,
  },
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    inputPerMillion: 2.5,
    outputPerMillion: 10,
    contextWindow: 128_000,
    maxOutput: 16_384,
    jsonMode: true,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    contextWindow: 128_000,
    maxOutput: 16_384,
    jsonMode: true,
  },
  // Google pricing is tiered by prompt length; these are the rates for the
  // short prompts this app sends. Verify against the current price list before
  // relying on the cost dashboard for anything financial.
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    provider: "google",
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    jsonMode: true,
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "google",
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
    contextWindow: 1_048_576,
    maxOutput: 65_536,
    jsonMode: true,
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    provider: "google",
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
    contextWindow: 1_048_576,
    maxOutput: 8_192,
    jsonMode: true,
  },
};

/**
 * Ordered candidate chains. The first entry is preferred; the rest are
 * fallbacks, deliberately spanning providers so a single vendor outage cannot
 * take the task down.
 */
export const ROUTES: Readonly<Record<Task, readonly string[]>> = {
  generation: ["claude-opus-4-8", "gemini-2.5-pro", "claude-sonnet-5", "gpt-4o"],
  judge: ["gemini-2.5-flash", "claude-sonnet-5", "gpt-4o-mini"],
  extraction: ["gemini-2.5-flash", "claude-sonnet-5", "gpt-4o-mini"],
  cheap: ["gemini-2.0-flash", "claude-haiku-4-5-20251001", "gpt-4o-mini"],
};

/**
 * The chains span providers on purpose, so one vendor outage cannot take a task
 * down. The gateway skips any model whose provider has no client configured, so
 * running on Gemini alone works: the Claude and OpenAI entries are simply never
 * reached.
 */

export function modelSpec(id: string): ModelSpec | undefined {
  return MODELS[id];
}

/** Cost in USD for a completed call. */
export function costUsd(spec: ModelSpec, inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * spec.inputPerMillion +
    (outputTokens / 1_000_000) * spec.outputPerMillion
  );
}
