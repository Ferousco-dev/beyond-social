import { createHash } from "node:crypto";

import type { Embedder } from "../ports";

/**
 * Caching for embeddings.
 *
 * Embeddings are a pure function of (model, text), so re-embedding text we have
 * already seen is money spent on an answer we already have. Ingestion re-runs
 * and repeated queries make that the common case, not an edge case.
 *
 * This is a decorator rather than a change to each provider, so the caching
 * rule lives in one place and any future `Embedder` gets it for free.
 */

export interface EmbeddingCache {
  get(key: string): Promise<readonly number[] | undefined>;
  set(key: string, embedding: readonly number[]): Promise<void>;
}

/** Model is part of the key: two models produce different vectors for one text. */
export function embeddingKey(model: string, text: string): string {
  return `${model}:${createHash("sha256").update(text).digest("hex")}`;
}

const DEFAULT_MAX_ENTRIES = 5_000;

/**
 * In-process LRU. Bounded because an unbounded cache in a long-running worker
 * is a memory leak with extra steps. Eviction is by insertion order, refreshed
 * on read, which `Map` gives us by deleting and reinserting.
 */
export class MemoryEmbeddingCache implements EmbeddingCache {
  private readonly entries = new Map<string, readonly number[]>();

  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  get size(): number {
    return this.entries.size;
  }

  get(key: string): Promise<readonly number[] | undefined> {
    const hit = this.entries.get(key);
    if (hit !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, hit);
    }
    return Promise.resolve(hit);
  }

  set(key: string, embedding: readonly number[]): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, embedding);
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    return Promise.resolve();
  }
}

export interface EmbeddingCacheStats {
  hits: number;
  misses: number;
  /** Texts that appeared more than once inside a single batch. */
  deduped: number;
}

/**
 * Wraps an `Embedder` so repeated text is served from cache.
 *
 * Two savings, both about the same thing: only send text the provider has not
 * already answered for. Cached texts are dropped from the request, and
 * duplicates inside one batch are collapsed to a single input. Output order
 * always matches input order, which callers rely on to line vectors up with
 * their chunks.
 */
export class CachingEmbedder implements Embedder {
  readonly model: string;
  readonly dim: number;
  private readonly stats: EmbeddingCacheStats = { hits: 0, misses: 0, deduped: 0 };

  constructor(
    private readonly inner: Embedder,
    private readonly cache: EmbeddingCache = new MemoryEmbeddingCache(),
  ) {
    this.model = inner.model;
    this.dim = inner.dim;
  }

  /** Counters for cost reporting; a cache with no visible hit rate is a guess. */
  getStats(): Readonly<EmbeddingCacheStats> {
    return { ...this.stats };
  }

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const out = new Array<number[] | undefined>(texts.length);
    // Distinct misses, each mapped to every position that wants it.
    const pending = new Map<string, number[]>();

    for (const [index, text] of texts.entries()) {
      const existing = pending.get(text);
      if (existing) {
        existing.push(index);
        this.stats.deduped += 1;
        continue;
      }

      const cached = await this.cache.get(embeddingKey(this.model, text));
      if (cached) {
        out[index] = [...cached];
        this.stats.hits += 1;
        continue;
      }

      this.stats.misses += 1;
      pending.set(text, [index]);
    }

    if (pending.size > 0) {
      const missing = [...pending.keys()];
      const fresh = await this.inner.embed(missing);
      if (fresh.length !== missing.length) {
        throw new Error(`Embedder returned ${fresh.length} vectors for ${missing.length} inputs.`);
      }

      for (const [position, text] of missing.entries()) {
        const embedding = fresh[position];
        if (embedding === undefined) throw new Error(`Missing embedding at index ${position}`);
        await this.cache.set(embeddingKey(this.model, text), embedding);
        for (const target of pending.get(text) ?? []) out[target] = [...embedding];
      }
    }

    return out.map((embedding, index) => {
      if (embedding === undefined) throw new Error(`Missing embedding at index ${index}`);
      return embedding;
    });
  }
}
