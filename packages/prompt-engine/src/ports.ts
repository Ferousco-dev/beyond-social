import type { Chunk } from "./schema/chunk";
import type { ChunkScore } from "./schema/scoring";
import type { AuditEntry, CandidateStatus, LearningCandidate } from "./schema/learning";

/**
 * Ports (hexagonal boundaries). The engine depends only on these interfaces, so
 * embeddings, vector storage, reranking, and generation can each be swapped
 * (Voyage <-> OpenAI, pgvector <-> Qdrant, Claude <-> GPT) without touching the
 * retrieval, composition, feedback, or evaluation logic.
 */

export interface Embedder {
  readonly model: string;
  readonly dim: number;
  /** Batched for throughput; returns one vector per input, order preserved. */
  embed(texts: readonly string[]): Promise<number[][]>;
}

/** A candidate returned from the store, before reranking and blending. */
export interface ScoredChunk {
  chunk: Chunk;
  score: ChunkScore;
  /** Cosine similarity from dense search, 0..1 (null for sparse-only hits). */
  similarity: number | null;
  /** BM25/full-text rank from sparse search (null for dense-only hits). */
  lexicalRank: number | null;
}

export interface VectorSearchParams {
  embedding: readonly number[];
  /** Lexical query string for the hybrid sparse leg. */
  text: string;
  limit: number;
  minSimilarity: number;
  filter?: {
    categories?: readonly string[];
    platforms?: readonly string[];
    productTypes?: readonly string[];
    status?: readonly string[];
  };
}

export interface VectorStore {
  upsert(chunks: readonly Chunk[], embeddings: readonly number[][]): Promise<void>;
  /** Hybrid dense + sparse search; the store fuses or returns both legs. */
  search(params: VectorSearchParams): Promise<ScoredChunk[]>;
  getScores(chunkIds: readonly string[]): Promise<Map<string, ChunkScore>>;
  applyScores(scores: readonly ChunkScore[]): Promise<void>;
  deprecate(chunkIds: readonly string[]): Promise<void>;
}

/** Optional cross-encoder reranker; a no-op passthrough is a valid default. */
export interface Reranker {
  readonly model: string;
  rerank(query: string, candidates: readonly ScoredChunk[]): Promise<Map<string, number>>;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompleteParams {
  system: string;
  messages: readonly LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  /** When set, instructs the adapter to return strict JSON for parsing. */
  json?: boolean;
}

export interface Llm {
  readonly model: string;
  complete(params: LlmCompleteParams): Promise<string>;
  /**
   * The same completion, delivered as it is written.
   *
   * Optional so an implementation is free to offer only `complete`; callers
   * that need text as it arrives check for it and fall back to waiting for the
   * whole string. Yields the pieces to append, nothing else: token counts and
   * cost are the gateway's business, not the caller's.
   */
  stream?(params: LlmCompleteParams): AsyncIterable<string>;
}

/**
 * Storage for the learning subsystem: pending candidates, the immutable audit
 * trail, and the version history of accepted chunks. Kept separate from the
 * retrieval VectorStore so the learning workflow can evolve (review queues,
 * multi-tenant scoping) without touching the hot retrieval path.
 */
export interface LearningStore {
  recordCandidate(candidate: LearningCandidate): Promise<void>;
  getCandidate(id: string): Promise<LearningCandidate | null>;
  listCandidates(status: CandidateStatus, workspaceId?: string): Promise<LearningCandidate[]>;
  setCandidateStatus(id: string, status: CandidateStatus): Promise<void>;
  logAudit(entry: AuditEntry): Promise<void>;
  /** Append a full chunk snapshot to its version history (never overwrites). */
  saveVersion(chunk: Chunk, reason: string): Promise<void>;
}
