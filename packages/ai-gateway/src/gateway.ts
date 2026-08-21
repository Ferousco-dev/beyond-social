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
import {
  type CompletionRequest,
  type CompletionResult,
  type ProviderClient,
  type StreamEvent,
} from "./providers";
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

/**
 * Headroom on the token estimate, which is a character count divided by four.
 * Right for English prose, optimistic for JSON, code and non-Latin scripts.
 */
const ESTIMATE_MARGIN = 1.15;

/** Assumed output when a caller does not say, so the window check has both halves. */
const DEFAULT_OUTPUT_RESERVE = 4_096;

/** Distinguishable from a provider's own errors, so callers can report honestly. */
export class ProviderTimeoutError extends Error {
  constructor(model: string, timeoutMs: number) {
    super(`${model} did not respond within ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
  }
}

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
/** Wraps a non-streaming completion as the two events a stream would emit. */
async function* singleChunk(result: CompletionResult): AsyncGenerator<StreamEvent> {
  yield { type: "chunk", text: result.text };
  yield {
    type: "done",
    usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
  };
}

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
    const decision = await this.limiter.take(
      request.userId ?? "anonymous",
      Math.max(1, promptTokens),
    );
    if (!decision.allowed) throw new RateLimitedError(decision.retryAfterMs);

    let lastError: unknown;

    for (const [index, spec] of candidates.entries()) {
      const client = this.options.clients[spec.provider];
      if (!client) continue;

      /*
       * A prompt that cannot fit is a terminal error for this model, not a
       * retryable one; skip straight to the next candidate.
       *
       * The budget is input *plus* output, because they share one window. The
       * check here compared the prompt alone, which passes a prompt sitting at
       * 95% of the window and then asks for 8k of completion on top, and the
       * provider rejects the whole thing. That reads as a mysterious 400 from
       * every model in the chain rather than as "too long".
       *
       * The margin covers the estimate itself: ~4 characters per token is right
       * for English prose and optimistic for JSON, code and non-Latin scripts,
       * all of which appear in real briefs. Being wrong in this direction costs
       * a slightly smaller usable window; being wrong in the other costs the
       * request.
       */
      const reservedOutput = Math.min(request.maxTokens ?? DEFAULT_OUTPUT_RESERVE, spec.maxOutput);
      const budget = Math.ceil(promptTokens * ESTIMATE_MARGIN) + reservedOutput;
      if (budget > spec.contextWindow) {
        lastError = new Error(
          `Prompt of ~${promptTokens} tokens plus ${reservedOutput} reserved for output exceeds the ${spec.contextWindow} token window of ${spec.id}`,
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
          /*
           * The gateway's own `cacheTtlMs` is an explicit override and wins
           * when set. Otherwise this asks the cache instance for its own
           * default rather than falling back to a module constant here: a
           * `MemoryResponseCache` built with a non-default `ttlMs` had that
           * value silently ignored, because nothing ever read it back, and
           * every entry lived for whatever this constant said regardless of
           * what the cache itself was configured with.
           */
          void this.options.cache.set(key, {
            result,
            model: spec.id,
            expiresAt: this.now() + (this.options.cacheTtlMs ?? this.options.cache.defaultTtlMs),
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

  /**
   * The same call, delivered as it is written.
   *
   * Routing, screening, rate limiting and cost accounting are the same as
   * `complete`. Two things are deliberately different.
   *
   * Fallback stops at the first token. Moving to another model mid-reply would
   * splice two different answers together in front of the user, so a failure
   * after text has been emitted is terminal even when the same failure would be
   * retried by `complete`. Before the first token nothing has been shown and
   * the chain moves on as usual.
   *
   * There is no retry inside a candidate for the same reason: a retry restarts
   * the stream, and the caller has already rendered what the first attempt
   * said.
   *
   * A provider with no `stream` is completed in full and emitted as one chunk,
   * so no caller has to ask which providers can stream.
   */
  async *stream(request: GatewayRequest): AsyncGenerator<StreamEvent> {
    const requestId = this.newId();
    const startedAt = this.now();
    const candidates = this.chain(request.task);

    this.screenInput(request);

    if (candidates.length === 0) {
      throw new Error(
        `No model available for task "${request.task}". Configure a provider client.`,
      );
    }

    const promptTokens = estimateTokens(
      request.system + request.messages.map((message) => message.content).join(" "),
    );
    const decision = await this.limiter.take(
      request.userId ?? "anonymous",
      Math.max(1, promptTokens),
    );
    if (!decision.allowed) throw new RateLimitedError(decision.retryAfterMs);

    let lastError: unknown;

    for (const [index, spec] of candidates.entries()) {
      const client = this.options.clients[spec.provider];
      if (!client) continue;

      const reservedOutput = Math.min(request.maxTokens ?? DEFAULT_OUTPUT_RESERVE, spec.maxOutput);
      const budget = Math.ceil(promptTokens * ESTIMATE_MARGIN) + reservedOutput;
      if (budget > spec.contextWindow) {
        lastError = new Error(
          `Prompt of ~${promptTokens} tokens plus ${reservedOutput} reserved for output exceeds the ${spec.contextWindow} token window of ${spec.id}`,
        );
        continue;
      }

      if (!this.breaker.allows(spec.provider)) {
        lastError = new Error(`${spec.provider} circuit is open`);
        continue;
      }

      let emitted = false;
      let text = "";
      let usage = { inputTokens: 0, outputTokens: 0 };

      try {
        const events = client.stream
          ? client.stream(spec, request)
          : singleChunk(await client.complete(spec, request));

        for await (const event of events) {
          if (event.type === "chunk" && event.text) {
            emitted = true;
            text += event.text;
            yield event;
          } else if (event.type === "done" && event.usage) {
            usage = event.usage;
          }
        }

        this.breaker.recordSuccess(spec.provider);
        // Screened at the end rather than per chunk: a rule about the whole
        // answer cannot be evaluated against a fragment of it. The caller is
        // told to discard what it has if this throws.
        this.screenOutput(text);

        const latencyMs = this.now() - startedAt;
        const result = { text, ...usage };
        const cost = costUsd(spec, usage.inputTokens, usage.outputTokens);
        void this.usage.record(
          this.buildRecord(requestId, request, spec, {
            result,
            cost,
            latencyMs,
            fallbacks: index,
            attempts: 1,
            ok: true,
            error: null,
          }),
        );

        yield { type: "done", usage };
        return;
      } catch (error) {
        lastError = error;
        if (isRetryable(error) || error instanceof ProviderTimeoutError) {
          this.breaker.recordFailure(spec.provider);
        }
        void this.usage.record(
          this.buildRecord(requestId, request, spec, {
            result: { text, ...usage },
            cost: 0,
            latencyMs: this.now() - startedAt,
            fallbacks: index,
            attempts: 1,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );

        // Past the first token there is no clean recovery: the user is already
        // reading the failed model's words.
        if (emitted) throw error;
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

    /*
     * `addEventListener("abort", ...)` on a signal that is already aborted
     * never fires: the event marks the transition into that state, and a
     * signal aborted before this ran has already made it. A caller passing an
     * already-cancelled signal, which is exactly the shape a request cancelled
     * while it was still queued takes, would have this reach the provider
     * anyway, uncancelled, only to be thrown away on a response nobody wanted.
     */
    const abortFromCaller = (): void => controller.abort();
    if (request.signal?.aborted) abortFromCaller();
    else request.signal?.addEventListener("abort", abortFromCaller);

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
