import { embeddingInput, sha256Hex } from "../content/hash";
import { templateContextualHeader } from "../content/context";
import { estimateTokens } from "../content/tokens";
import type { Embedder, LearningStore, VectorStore } from "../ports";
import { chunkSchema, type Chunk } from "../schema/chunk";
import {
  learningPolicySchema,
  type AuditAction,
  type DraftChunk,
  type LearningCandidate,
  type LearningPolicy,
  type PromptEvaluation,
} from "../schema/learning";
import type { KnowledgeExtractor } from "./extractor";
import type { KnowledgeMerger } from "./merge";
import type { PromptEvaluator, EvaluationContext } from "./prompt-evaluator";

export interface LearningPipelineDeps {
  evaluator: PromptEvaluator;
  extractor: KnowledgeExtractor;
  merger: KnowledgeMerger;
  embedder: Embedder;
  store: VectorStore;
  learningStore: LearningStore;
  now: () => string;
  newId: () => string;
}

export interface IngestPromptInput {
  prompt: string;
  output?: string;
  context?: EvaluationContext;
  policy?: Partial<LearningPolicy>;
  workspaceId?: string;
  sourceRef?: string;
}

export interface IngestResult {
  evaluation: PromptEvaluation;
  candidates: LearningCandidate[];
  autoPromoted: string[];
}

/**
 * The learning loop. Turns a submitted prompt into zero or more reviewed
 * candidates for the knowledge base, enforcing every safety gate in order:
 * evaluate -> discard noise -> extract & generalize -> deduplicate -> merge or
 * create -> version -> audit. Nothing enters the base without passing the gate,
 * and every decision leaves an audit record.
 */
export class LearningPipeline {
  constructor(private readonly deps: LearningPipelineDeps) {}

  async ingest(input: IngestPromptInput): Promise<IngestResult> {
    const policy = learningPolicySchema.parse(input.policy ?? {});
    const now = this.deps.now();

    const evaluation = await this.deps.evaluator.evaluate(
      input.prompt,
      input.context ?? {},
      policy,
      now,
    );
    await this.audit("evaluate", null, null, evaluation.decisionReason, {
      overall: evaluation.overall,
    });
    if (evaluation.decision === "discard") return { evaluation, candidates: [], autoPromoted: [] };

    const drafts = await this.deps.extractor.extract({
      prompt: input.prompt,
      output: input.output,
      priorQuality: evaluation.overall,
    });

    const candidates: LearningCandidate[] = [];
    const autoPromoted: string[] = [];
    for (const draft of drafts) {
      const resolved = await this.resolveAgainstCorpus(draft, policy);
      if (resolved === null) continue; // dropped as duplicate

      const candidate = this.makeCandidate(
        resolved.draft,
        resolved.targetChunkId,
        evaluation,
        input,
        now,
      );
      await this.deps.learningStore.recordCandidate(candidate);
      await this.audit(
        "create_candidate",
        resolved.targetChunkId,
        candidate.id,
        candidate.evaluation.decisionReason,
        {},
      );

      if (this.shouldAutoPromote(evaluation, policy)) {
        await this.promoteCandidate(candidate);
        autoPromoted.push(candidate.id);
      }
      candidates.push(candidate);
    }
    return { evaluation, candidates, autoPromoted };
  }

  /** Promote a reviewed candidate into the base (used by a review UI). */
  async promote(candidateId: string): Promise<void> {
    const candidate = await this.deps.learningStore.getCandidate(candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);
    await this.promoteCandidate(candidate);
  }

  async reject(candidateId: string, reason: string): Promise<void> {
    await this.deps.learningStore.setCandidateStatus(candidateId, "rejected");
    await this.audit("reject", null, candidateId, reason, {});
  }

  private async resolveAgainstCorpus(
    draft: DraftChunk,
    policy: LearningPolicy,
  ): Promise<{ draft: DraftChunk; targetChunkId: string | null } | null> {
    const [embedding] = await this.deps.embedder.embed([draft.body]);
    const nearest = embedding
      ? (
          await this.deps.store.search({ embedding, text: draft.body, limit: 1, minSimilarity: 0 })
        )[0]
      : undefined;
    const similarity = nearest?.similarity ?? 0;

    if (nearest && similarity >= policy.duplicateSimilarity) return null; // exact duplicate: drop
    if (nearest && similarity >= policy.mergeSimilarity) {
      const mergedBody = await this.deps.merger.merge(nearest.chunk, draft);
      return {
        draft: {
          ...draft,
          id: nearest.chunk.id,
          category: nearest.chunk.category,
          version: nearest.chunk.version + 1,
          body: mergedBody,
        },
        targetChunkId: nearest.chunk.id,
      };
    }
    return { draft, targetChunkId: null };
  }

  private async promoteCandidate(candidate: LearningCandidate): Promise<void> {
    /*
     * A merge candidate's body and version were computed once, against
     * whatever the target chunk looked like at ingest time. Nothing repeats
     * that check here, so a candidate held for review, that is the whole
     * point of the status this method exists to move a candidate out of,
     * promotes against a target that may have moved on since: another
     * candidate targeting the same chunk, resolved and promoted while this
     * one waited. Promoting anyway would upsert a body merged against a stale
     * snapshot under a version number that silently discards whatever that
     * other promotion wrote.
     *
     * Checked by re-running the same search `resolveAgainstCorpus` used
     * rather than adding a get-by-id to the store port for one caller: if the
     * target chunk still comes back at the version this candidate was
     * resolved against, nothing has changed underneath it.
     */
    if (candidate.targetChunkId) {
      const [probeEmbedding] = await this.deps.embedder.embed([candidate.draft.body]);
      const results = probeEmbedding
        ? await this.deps.store.search({
            embedding: probeEmbedding,
            text: candidate.draft.body,
            limit: 5,
            minSimilarity: 0,
          })
        : [];
      const target = results.find((result) => result.chunk.id === candidate.targetChunkId);
      const expectedVersion = candidate.draft.version - 1;
      if (!target || target.chunk.version !== expectedVersion) {
        throw new Error(
          `Candidate ${candidate.id} targets chunk ${candidate.targetChunkId} at version ${expectedVersion}, but it has since changed. Re-resolve before promoting.`,
        );
      }
    }

    const chunk = this.buildChunk(candidate.draft);
    const [embedding] = await this.deps.embedder.embed([
      embeddingInput(chunk.contextualHeader, chunk.body),
    ]);
    if (!embedding) throw new Error("Embedder returned no vector while promoting");

    await this.deps.store.upsert([chunk], [embedding]);
    const action: AuditAction = candidate.targetChunkId ? "merge" : "promote";
    await this.deps.learningStore.saveVersion(chunk, `${action} via candidate ${candidate.id}`);
    await this.deps.learningStore.setCandidateStatus(
      candidate.id,
      candidate.targetChunkId ? "merged" : "promoted",
    );
    await this.audit(action, chunk.id, candidate.id, "promoted into knowledge base", {});
  }

  private buildChunk(draft: DraftChunk): Chunk {
    const now = this.deps.now();
    const contextualHeader = templateContextualHeader(draft, { heading: "", text: draft.body });
    return chunkSchema.parse({
      ...draft,
      contextualHeader,
      status: "active",
      tokenCount: estimateTokens(draft.body),
      contentHash: sha256Hex(embeddingInput(contextualHeader, draft.body)),
      embeddingModel: this.deps.embedder.model,
      embeddingDim: this.deps.embedder.dim,
      createdAt: now,
      updatedAt: now,
    });
  }

  private makeCandidate(
    draft: DraftChunk,
    targetChunkId: string | null,
    evaluation: PromptEvaluation,
    input: IngestPromptInput,
    now: string,
  ): LearningCandidate {
    return {
      id: this.deps.newId(),
      draft,
      status: "pending",
      evaluation,
      targetChunkId,
      sourceRef: input.sourceRef ?? null,
      workspaceId: input.workspaceId ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private shouldAutoPromote(evaluation: PromptEvaluation, policy: LearningPolicy): boolean {
    if (policy.reviewByDefault) return false;
    return (
      evaluation.overall >= policy.autoPromoteAbove &&
      evaluation.confidence >= policy.autoPromoteAbove
    );
  }

  private audit(
    action: AuditAction,
    chunkId: string | null,
    candidateId: string | null,
    reason: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    return this.deps.learningStore.logAudit({
      id: this.deps.newId(),
      action,
      chunkId,
      candidateId,
      actor: "system",
      reason,
      meta,
      createdAt: this.deps.now(),
    });
  }
}
