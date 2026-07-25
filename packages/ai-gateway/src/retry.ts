/**
 * Retry policy. Provider APIs fail in two very different ways: transient
 * (429, 5xx, network) which retrying fixes, and terminal (400, 401, 403) which
 * retrying only makes more expensive. Classifying them is the whole job.
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    /** Seconds the provider asked us to wait, when it said so. */
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Transient failures worth another attempt. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof ProviderError) {
    if (error.status === null) return true; // network or timeout
    if (error.status === 408 || error.status === 409 || error.status === 429) return true;
    return error.status >= 500;
  }
  // A bare fetch rejection is a network fault.
  return error instanceof TypeError;
}

export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Injected so tests do not actually wait. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected so backoff is deterministic under test. */
  random?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff with full jitter. Jitter matters: without it, every
 * client that hit the same rate limit retries in lockstep and rate-limits the
 * provider again. A `Retry-After` header always wins over our own schedule.
 */
export function backoffMs(
  attempt: number,
  options: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs">,
  retryAfterSeconds: number | null,
  random: () => number,
): number {
  if (retryAfterSeconds !== null) return Math.min(retryAfterSeconds * 1000, options.maxDelayMs);
  const ceiling = Math.min(options.baseDelayMs * 2 ** attempt, options.maxDelayMs);
  return Math.round(random() * ceiling);
}

/** Runs `fn`, retrying transient failures until attempts are exhausted. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  let lastError: unknown;

  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === options.attempts - 1) throw error;
      const retryAfter = error instanceof ProviderError ? error.retryAfterSeconds : null;
      await sleep(backoffMs(attempt, options, retryAfter, random));
    }
  }

  throw lastError;
}
