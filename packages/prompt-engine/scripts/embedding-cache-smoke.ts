/**
 * Behaviour checks for the embedding cache. A counting fake embedder stands in
 * for a provider, so the saving is measured rather than assumed.
 *
 *   tsx scripts/embedding-cache-smoke.ts
 */
import {
  CachingEmbedder,
  MemoryEmbeddingCache,
  embeddingKey,
} from "../src/adapters/embedding-cache";
import type { Embedder } from "../src/ports";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

/** Records what it was asked to embed, and returns a vector derived from the text. */
class CountingEmbedder implements Embedder {
  readonly model = "fake-embed-1";
  readonly dim = 3;
  readonly batches: string[][] = [];

  embed(texts: readonly string[]): Promise<number[][]> {
    this.batches.push([...texts]);
    return Promise.resolve(texts.map((text) => [text.length, text.charCodeAt(0) || 0, 1]));
  }
}

function totalEmbedded(inner: CountingEmbedder): number {
  return inner.batches.reduce((sum, batch) => sum + batch.length, 0);
}

async function main(): Promise<void> {
  // A repeated call must not reach the provider a second time.
  {
    const inner = new CountingEmbedder();
    const cached = new CachingEmbedder(inner);
    const first = await cached.embed(["alpha", "beta"]);
    const second = await cached.embed(["alpha", "beta"]);
    check("serves a repeat from cache", totalEmbedded(inner) === 2, `${totalEmbedded(inner)} sent`);
    check("returns the same vectors", JSON.stringify(first) === JSON.stringify(second));
    check("counts two hits", cached.getStats().hits === 2);
  }

  // A partial hit must send only the misses, and still return every vector in
  // input order. Order is what callers use to line vectors up with chunks.
  {
    const inner = new CountingEmbedder();
    const cached = new CachingEmbedder(inner);
    await cached.embed(["a", "b"]);
    const mixed = await cached.embed(["b", "c", "a"]);
    check(
      "sends only the misses",
      inner.batches[1]?.join(",") === "c",
      inner.batches[1]?.join(","),
    );
    check(
      "preserves input order across a partial hit",
      JSON.stringify(mixed) ===
        JSON.stringify([
          [1, "b".charCodeAt(0), 1],
          [1, "c".charCodeAt(0), 1],
          [1, "a".charCodeAt(0), 1],
        ]),
    );
  }

  // Duplicates inside one batch are one input, not several, but every position
  // must still receive its vector.
  {
    const inner = new CountingEmbedder();
    const cached = new CachingEmbedder(inner);
    const out = await cached.embed(["x", "y", "x", "x"]);
    check(
      "collapses duplicates in a batch",
      inner.batches[0]?.length === 2,
      String(inner.batches[0]?.length),
    );
    check("fills every duplicate position", out.length === 4 && out[0]?.[1] === out[3]?.[1]);
    check("counts the deduped inputs", cached.getStats().deduped === 2);
  }

  // Mutating a returned vector must not corrupt the cached copy.
  {
    const cached = new CachingEmbedder(new CountingEmbedder());
    const [vector] = await cached.embed(["shared"]);
    if (vector) vector[0] = 999;
    const [again] = await cached.embed(["shared"]);
    check("hands out copies, not the cached array", again?.[0] !== 999, String(again?.[0]));
  }

  // Two models must not share an entry, or a dimension mismatch reaches pgvector.
  {
    const a = embeddingKey("model-a", "same text");
    const b = embeddingKey("model-b", "same text");
    check("keys by model as well as text", a !== b);
    check("keys the same text identically", embeddingKey("m", "t") === embeddingKey("m", "t"));
  }

  // An unbounded cache in a worker is a memory leak; eviction must be by LRU.
  {
    const cache = new MemoryEmbeddingCache(2);
    await cache.set("one", [1]);
    await cache.set("two", [2]);
    await cache.get("one"); // refreshes "one", so "two" is now oldest
    await cache.set("three", [3]);
    check("bounds the cache", cache.size === 2, String(cache.size));
    check("evicts least recently used", (await cache.get("two")) === undefined);
    check("keeps the refreshed entry", (await cache.get("one")) !== undefined);
  }

  // A provider returning the wrong count must fail loudly, not misalign vectors.
  {
    const broken: Embedder = {
      model: "broken",
      dim: 3,
      embed: () => Promise.resolve([[1, 2, 3]]),
    };
    let threw = false;
    try {
      await new CachingEmbedder(broken).embed(["one", "two"]);
    } catch {
      threw = true;
    }
    check("rejects a mismatched provider response", threw);
  }

  // An empty batch must never hit the provider.
  {
    const inner = new CountingEmbedder();
    const out = await new CachingEmbedder(inner).embed([]);
    check("short-circuits an empty batch", out.length === 0 && inner.batches.length === 0);
  }

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
