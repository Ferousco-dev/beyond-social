import { createHash } from "node:crypto";

import { type CompletionRequest, type CompletionResult } from "./providers";
import { type Task } from "./models";

/**
 * Response cache. Identical requests are common in practice (a retried
 * generation, two users asking the same thing, a judge re-scoring unchanged
 * output), and each one is a paid round trip. Caching them is the cheapest
 * saving available once every call funnels through the gateway.
 *
 * Only deterministic requests are cached. At a non-zero temperature the caller
 * is asking for variety, so returning a stored answer would be wrong, not
 * merely stale.
 */

export interface CacheEntry {
  result: CompletionResult;
  model: string;
  /** Epoch millis after which the entry must not be served. */
  expiresAt: number;
}

export interface ResponseCache {
  get(key: string): CacheEntry | undefined | Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): void | Promise<void>;
}

/**
 * The cache key must cover everything that changes the answer: the task chain,
 * the prompt, and the sampling parameters. It deliberately does not include the
 * user, so a popular request is paid for once across the whole platform.
 */
export function cacheKey(task: Task, request: CompletionRequest): string {
  const payload = JSON.stringify({
    task,
    system: request.system,
    messages: request.messages.map((message) => [message.role, message.content]),
    temperature: request.temperature ?? null,
    maxTokens: request.maxTokens ?? null,
    json: request.json ?? false,
  });
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Whether a request may be served from, or written to, cache. Temperature 0 is
 * a request for the single most likely answer, which is exactly the case where
 * reuse is safe.
 */
export function isCacheable(request: CompletionRequest): boolean {
  return (request.temperature ?? 1) === 0;
}

interface Stored extends CacheEntry {
  /** Insertion order, used to evict the oldest entry first. */
  seq: number;
}

/**
 * Bounded in-memory cache with TTL. Correct for a single process; the
 * `ResponseCache` interface is the seam where Redis drops in so a fleet shares
 * one cache.
 */
export class MemoryResponseCache implements ResponseCache {
  private readonly entries = new Map<string, Stored>();
  private seq = 0;
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxEntries = 500,
    private readonly ttlMs = 60 * 60 * 1000,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): CacheEntry | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      // Oldest insertion wins eviction; keys are cheap to scan at this size.
      let oldestKey: string | undefined;
      let oldestSeq = Infinity;
      for (const [candidateKey, candidate] of this.entries) {
        if (candidate.seq < oldestSeq) {
          oldestSeq = candidate.seq;
          oldestKey = candidateKey;
        }
      }
      if (oldestKey !== undefined) this.entries.delete(oldestKey);
    }
    this.seq += 1;
    this.entries.set(key, { ...entry, seq: this.seq });
  }

  /** Default TTL applied when the gateway stores an entry. */
  get defaultTtlMs(): number {
    return this.ttlMs;
  }

  stats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.entries.size,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}
