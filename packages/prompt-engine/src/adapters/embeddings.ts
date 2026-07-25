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
