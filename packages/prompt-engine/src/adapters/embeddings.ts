import type { Embedder } from "../ports";
import { postJson } from "./http";

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

/**
 * Voyage AI embeddings (Anthropic's recommended retrieval embeddings). Primary
 * choice for quality on retrieval tasks. `input_type` distinguishes documents
 * from queries, which Voyage uses to asymmetrically encode both sides.
 */
export class VoyageEmbedder implements Embedder {
  constructor(
    private readonly apiKey: string,
    readonly model = "voyage-3-large",
    readonly dim = 1024,
    private readonly inputType: "document" | "query" = "document",
  ) {}

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await postJson<EmbeddingResponse>(
      "https://api.voyageai.com/v1/embeddings",
      { authorization: `Bearer ${this.apiKey}` },
      { input: texts, model: this.model, input_type: this.inputType },
    );
    return orderByIndex(res, texts.length);
  }
}

/** OpenAI embeddings, a drop-in fallback behind the same interface. */
export class OpenAiEmbedder implements Embedder {
  constructor(
    private readonly apiKey: string,
    readonly model = "text-embedding-3-large",
    readonly dim = 3072,
  ) {}

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await postJson<EmbeddingResponse>(
      "https://api.openai.com/v1/embeddings",
      { authorization: `Bearer ${this.apiKey}` },
      { input: texts, model: this.model },
    );
    return orderByIndex(res, texts.length);
  }
}

/** Providers may return out of order; realign to the input order defensively. */
function orderByIndex(res: EmbeddingResponse, expected: number): number[][] {
  const out: number[][] = new Array<number[]>(expected);
  for (const item of res.data) out[item.index] = item.embedding;
  for (let i = 0; i < expected; i++) {
    if (out[i] === undefined) throw new Error(`Missing embedding at index ${i}`);
  }
  return out;
}

interface GeminiEmbedResponse {
  embedding?: { values?: number[] };
}

/** How many embed calls are in flight at once. */
const GEMINI_CONCURRENCY = 4;

/**
 * Google Gemini embeddings.
 *
 * One request per text, because `gemini-embedding-001` exposes `embedContent`
 * and an async batch job, but not the synchronous `batchEmbedContents` the
 * other providers offer. Requests are run a few at a time rather than serially,
 * which keeps a corpus ingest reasonable without tripping rate limits.
 *
 * `taskType` matters: Google encodes documents and queries asymmetrically, and
 * using the wrong side measurably degrades retrieval.
 */
export class GeminiEmbedder implements Embedder {
  constructor(
    private readonly apiKey: string,
    readonly model = "gemini-embedding-001",
    /**
     * The model returns 3072 by default and supports Matryoshka truncation to
     * shorter lengths. 1024 is the width of the pgvector column, so asking for
     * it directly avoids a migration and a re-ingest.
     */
    readonly dim = 1024,
    private readonly taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
  ) {}

  private async embedOne(text: string): Promise<number[]> {
    const res = await postJson<GeminiEmbedResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent`,
      { "x-goog-api-key": this.apiKey },
      {
        content: { parts: [{ text }] },
        taskType: this.taskType,
        outputDimensionality: this.dim,
      },
    );

    const values = res.embedding?.values;
    if (!values || values.length === 0) throw new Error("Gemini returned an empty embedding");
    return normalise(values);
  }

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const out = new Array<number[]>(texts.length);
    // A simple worker pool: each worker pulls the next index, so a slow request
    // cannot stall a whole batch the way fixed chunking would.
    let next = 0;
    const workers = Array.from(
      { length: Math.min(GEMINI_CONCURRENCY, texts.length) },
      async (): Promise<void> => {
        for (;;) {
          const index = next++;
          const text = texts[index];
          if (text === undefined) return;
          out[index] = await this.embedOne(text);
        }
      },
    );
    await Promise.all(workers);

    return out;
  }
}

/**
 * Scales a vector to unit length.
 *
 * Truncating below the model's native width leaves the vector un-normalised
 * (a 1024-wide slice measures about 0.62), which Google's guidance says to
 * correct. Cosine search is unaffected by magnitude, but an inner-product or
 * L2 comparison would be, so the stored vectors are normalised rather than
 * depending on which operator a query happens to use.
 */
function normalise(values: readonly number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return magnitude > 0 ? values.map((value) => value / magnitude) : [...values];
}
