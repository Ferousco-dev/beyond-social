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
  embeddings?: { values?: number[] }[];
}

/**
 * Google Gemini embeddings.
 *
 * Batched through `batchEmbedContents`, which is one request for the whole set
 * rather than one per text. `taskType` matters: Google encodes documents and
 * queries differently, and using the wrong side measurably degrades retrieval.
 */
export class GeminiEmbedder implements Embedder {
  constructor(
    private readonly apiKey: string,
    readonly model = "text-embedding-004",
    readonly dim = 768,
    private readonly taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
  ) {}

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const res = await postJson<GeminiEmbedResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:batchEmbedContents`,
      { "x-goog-api-key": this.apiKey },
      {
        requests: texts.map((text) => ({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
          taskType: this.taskType,
        })),
      },
    );

    const embeddings = res.embeddings ?? [];
    if (embeddings.length !== texts.length) {
      throw new Error(`Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs`);
    }
    // Order is guaranteed to match the request order here, unlike the providers
    // above which return an explicit index.
    return embeddings.map((entry, index) => {
      const values = entry.values;
      if (!values) throw new Error(`Missing embedding at index ${index}`);
      return values;
    });
  }
}
