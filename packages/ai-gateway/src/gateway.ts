import {
  MODELS,
  ROUTES,
  costUsd,
  modelSpec,
  type ModelSpec,
  type Provider,
  type Task,
} from "./models";
import { cacheKey, isCacheable, type ResponseCache } from "./cache";
import { NoopLimiter, RateLimitedError, type RateLimiter } from "./rate-limit";
import { estimateTokens } from "./tokens";
import { CircuitBreaker, type BreakerOptions } from "./breaker";
import { isRetryable, withRetry, type RetryOptions } from "./retry";
import { type CompletionRequest, type CompletionResult, type ProviderClient } from "./providers";
import {
  InjectionError,
  ModerationError,
  detectInjection,
  moderate,
  type InjectionSeverity,
} from "./safety";
import { NoopUsageSink, type UsageRecord, type UsageSink } from "./usage";

export interface GatewayOptions {
  clients: Partial<Record<Provider, ProviderClient>>;
  limiter?: RateLimiter;
  usage?: UsageSink;
  /** Serves identical deterministic requests without paying for them again. */
  cache?: ResponseCache;
  /** How long a cached response stays valid. */
  cacheTtlMs?: number;
  retry?: Partial<RetryOptions>;
  /** Per-provider failure isolation. Defaults are usually right. */
  breaker?: Partial<BreakerOptions>;
  /**
   * How long one attempt may take before it is abandoned.
   *
   * Without this the fallback chain below is unreachable in the case it was
   * written for. Retry and cross-provider failover both trigger on an error, and
   * a provider that hangs never produces one: the call simply never returns, and
   * the caller waits until something further up the stack gives up. A deadline
   * is what turns a hang into a failure the chain can act on.
   */
  timeoutMs?: number;
  /** Overrides the default candidate chain for a task. */
  routes?: Partial<Record<Task, readonly string[]>>;
  now?: () => number;
  newId?: () => string;
  /**
   * Screening applied to the prompt before dispatch and to the completion
   * before it is returned. Off by default so internal, trusted callers pay
   * nothing; the web app turns it on for anything user-supplied.
   */
  safety?: {
    /** Refuse prompts at or above this injection severity. */
    blockInjectionAt?: Exclude<InjectionSeverity, "none">;
    moderateInput?: boolean;
    moderateOutput?: boolean;
  };
}

export interface GatewayRequest extends CompletionRequest {
  task: Task;
  /** Rate limiting and usage attribution key. */
  userId?: string;
}

export interface GatewayResponse extends CompletionResult {
  model: string;
  provider: Provider;
  costUsd: number;
  latencyMs: number;
  fallbacks: number;
  /** True when the answer came from cache and cost nothing. */
  cached: boolean;
}

const DEFAULT_RETRY: RetryOptions = { attempts: 3, baseDelayMs: 500, maxDelayMs: 8_000 };

/**
 * Generous, because a long completion is not a stuck one. This exists to catch a
 * connection that has died quietly, not to cap how long a model may think.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

/** Distinguishable from a provider's own errors, so callers can report honestly. */
export class ProviderTimeoutError extends Error {
  constructor(model: string, timeoutMs: number) {
    super(`${model} did not respond within ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
  }
}
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * The AI gateway: one entry point for every model call.
 *
 * It validates the request against the target model's limits, sheds load at our
 * own edge, walks a per-task chain of models retrying transient failures, falls
 * back across providers so one vendor outage is survivable, and records exact
 * token usage and cost for every attempt.
 *
 * Callers name a *task*, not a model. That indirection is the point: routing,
 * pricing, and fallbacks change here without touching call sites.
 */
export class AiGateway {
  private readonly limiter: RateLimiter;
  private readonly usage: UsageSink;
  private readonly retry: RetryOptions;
  private readonly breaker: CircuitBreaker;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(private readonly options: GatewayOptions) {
    this.limiter = options.limiter ?? new NoopLimiter();
    this.usage = options.usage ?? new NoopUsageSink();
    this.retry = { ...DEFAULT_RETRY, ...options.retry };
    this.breaker = new CircuitBreaker({ ...options.breaker, now: options.now });
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? (() => `req_${Math.random().toString(36).slice(2, 10)}`);
  }

  /** Models to try for a task, in order, keeping only ones we have a client for. */
  private chain(task: Task): ModelSpec[] {
    const ids = this.options.routes?.[task] ?? ROUTES[task];
    return ids
      .map((id) => modelSpec(id))
      .filter((spec): spec is ModelSpec => spec !== undefined)
      .filter((spec) => this.options.clients[spec.provider] !== undefined);
  }

  async complete(request: GatewayRequest): Promise<GatewayResponse> {
    const requestId = this.newId();
    const startedAt = this.now();
    const candidates = this.chain(request.task);

    // Screening happens before anything is spent, and before the cache, so a
    // hostile prompt can neither cost money nor be served from a warm entry.
    this.screenInput(request);

    if (candidates.length === 0) {
      throw new Error(
        `No model available for task "${request.task}". Configure a provider client.`,
      );
    }

    // A cache hit spends no provider quota, so it is checked before the limiter
    // rather than after: charging the bucket for a free answer would be wrong.
    const cacheable = this.options.cache !== undefined && isCacheable(request);
    const key = cacheable ? cacheKey(request.task, request) : null;
    if (key !== null && this.options.cache) {
      const hit = await this.options.cache.get(key);
      if (hit) {
        const latencyMs = this.now() - startedAt;
        const spec = modelSpec(hit.model);
        void this.usage.record({
          requestId,
          task: request.task,
          model: hit.model,
          provider: spec?.provider ?? "local",
          inputTokens: hit.result.inputTokens,
          outputTokens: hit.result.outputTokens,
          costUsd: 0,
          latencyMs,
          fallbacks: 0,
          attempts: 1,
          cached: true,
          ok: true,
          error: null,
          userId: request.userId ?? null,
          createdAt: new Date(this.now()).toISOString(),
        });
        return {
          ...hit.result,
          model: hit.model,
          provider: spec?.provider ?? "local",
          costUsd: 0,
          latencyMs,
          fallbacks: 0,
          cached: true,
        };
      }
    }

    // Shed load before spending anything. Cost is in estimated input tokens, so
    // a large prompt consumes more of the budget than a small one.
    const promptTokens = estimateTokens(
      request.system + request.messages.map((message) => message.content).join(" "),
    );
    const decision = this.limiter.take(request.userId ?? "anonymous", Math.max(1, promptTokens));
    if (!decision.allowed) throw new RateLimitedError(decision.retryAfterMs);

    let lastError: unknown;

    for (const [index, spec] of candidates.entries()) {
      const client = this.options.clients[spec.provider];
      if (!client) continue;

      // A prompt that cannot fit is a terminal error for this model, not a
      // retryable one; skip straight to the next candidate.
      if (promptTokens > spec.contextWindow) {
        lastError = new Error(
          `Prompt of ~${promptTokens} tokens exceeds ${spec.id} context window`,
        );
        continue;
      }

      // A provider that has been failing is skipped outright rather than
      // retried into. The chain moves to the next candidate immediately, so an
      // outage costs one hop instead of a full backoff schedule per model.
      if (!this.breaker.allows(spec.provider)) {
        lastError = new Error(`${spec.provider} circuit is open`);
        continue;
      }

      let attempts = 0;
      try {
        const result = await withRetry(() => {
          attempts += 1;
          return this.completeWithDeadline(client, spec, request);
        }, this.retry);

        this.breaker.recordSuccess(spec.provider);

        this.screenOutput(result.text);

        const latencyMs = this.now() - startedAt;
        const cost = costUsd(spec, result.inputTokens, result.outputTokens);
        void this.usage.record(
          this.buildRecord(requestId, request, spec, {
            result,
            cost,
            latencyMs,
            fallbacks: index,
            attempts,
            ok: true,
            error: null,
          }),
        );

        if (key !== null && this.options.cache) {
          void this.options.cache.set(key, {
            result,
            model: spec.id,
            expiresAt: this.now() + (this.options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
          });
        }

        return {
          ...result,
          model: spec.id,
          provider: spec.provider,
          costUsd: cost,
          latencyMs,
          fallbacks: index,
          cached: false,
        };
      } catch (error) {
        lastError = error;
        // Only a transient failure says anything about the provider's health. A
        // rejected prompt or a retired model is this request's problem, and
        // counting it would take a healthy provider out of rotation.
        if (isRetryable(error) || error instanceof ProviderTimeoutError) {
          this.breaker.recordFailure(spec.provider);
        }
        void this.usage.record(
          this.buildRecord(requestId, request, spec, {
            result: { text: "", inputTokens: 0, outputTokens: 0 },
            cost: 0,
            latencyMs: this.now() - startedAt,
            fallbacks: index,
            attempts: Math.max(1, attempts),
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`All models failed for task "${request.task}"`);
  }

  /** Refuses hostile or disallowed prompts before any provider is called. */
  private screenInput(request: GatewayRequest): void {
    const safety = this.options.safety;
    if (!safety) return;

    const text = request.messages.map((message) => message.content).join("\n");

    if (safety.blockInjectionAt) {
      const verdict = detectInjection(text);
      const order: InjectionSeverity[] = ["none", "low", "medium", "high"];
      if (order.indexOf(verdict.severity) >= order.indexOf(safety.blockInjectionAt)) {
        throw new InjectionError(verdict.findings.map((finding) => finding.pattern));
      }
    }

    if (safety.moderateInput) {
      const verdict = moderate(text);
      if (verdict.action === "block") throw new ModerationError("input", verdict);
    }
  }

  /**
   * One attempt, bounded.
   *
   * The signal is passed to the provider so the connection is actually torn
   * down rather than left running while we stop waiting for it, which is the
   * difference between a timeout and a leak. A caller that supplies its own
   * signal still wins: aborting that one aborts this.
   */
  private async completeWithDeadline(
    client: ProviderClient,
    spec: ModelSpec,
    request: GatewayRequest,
  ): Promise<CompletionResult> {
    const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const abortFromCaller = (): void => controller.abort();
    request.signal?.addEventListener("abort", abortFromCaller);

    try {
      return await client.complete(spec, { ...request, signal: controller.signal });
    } catch (error) {
      // The provider reports an abort as its own generic error, so the reason
      // has to be reconstructed here or the log says "fetch failed".
      if (controller.signal.aborted && !request.signal?.aborted) {
        throw new ProviderTimeoutError(spec.id, timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  /** Refuses disallowed completions before they reach the caller. */
  private screenOutput(text: string): void {
    if (!this.options.safety?.moderateOutput) return;
    const verdict = moderate(text);
    if (verdict.action === "block") throw new ModerationError("output", verdict);
  }

  private buildRecord(
    requestId: string,
    request: GatewayRequest,
    spec: ModelSpec,
    outcome: {
      result: CompletionResult;
      cost: number;
      latencyMs: number;
      fallbacks: number;
      attempts: number;
      ok: boolean;
      error: string | null;
    },
  ): UsageRecord {
    return {
      requestId,
      task: request.task,
      model: spec.id,
      provider: spec.provider,
      inputTokens: outcome.result.inputTokens,
      outputTokens: outcome.result.outputTokens,
      costUsd: outcome.cost,
      latencyMs: outcome.latencyMs,
      fallbacks: outcome.fallbacks,
      attempts: outcome.attempts,
      cached: false,
      ok: outcome.ok,
      error: outcome.error,
      userId: request.userId ?? null,
      createdAt: new Date(this.now()).toISOString(),
    };
  }
}

export { MODELS };
