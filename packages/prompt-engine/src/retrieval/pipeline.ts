import { packByBudget } from "../content/tokens";
import type { Embedder, Reranker, VectorStore } from "../ports";
import type { GenerationRequest } from "../schema/feedback";
import type { Recipe, RetrievalSlot } from "../schema/recipe";
import { mmrSelect } from "./mmr";
import { buildQueryText } from "./query";
import { rankCandidates, type RankedChunk } from "./rank";

/** Overfetch factor: pull more candidates than needed so rerank + MMR + budget
 * have room to work before the slot cap trims the set. */
const OVERFETCH = 4;

export interface SlotResult {
  slot: RetrievalSlot;
  chunks: RankedChunk[];
}

export interface RetrievalResult {
  queryText: string;
  slots: SlotResult[];
  /** Flat, budget-respecting selection in prompt (slot) order. */
  selected: RankedChunk[];
}

/**
 * Orchestrates one retrieval: embed the query, hybrid-search the store with
 * metadata filters, rerank, blend, diversify, then assign to the recipe's slots
 * within the global token budget. Pure with respect to its ports, so it is fully
 * unit-testable with in-memory fakes.
 */
export class Retriever {
  constructor(
    private readonly embedder: Embedder,
    private readonly store: VectorStore,
    private readonly reranker: Reranker,
  ) {}

  async retrieve(request: GenerationRequest, recipe: Recipe): Promise<RetrievalResult> {
    const queryText = buildQueryText(request);
    const [embedding] = await this.embedder.embed([queryText]);
    if (!embedding) throw new Error("Embedder returned no vector for the query");

    const categories = [...new Set(recipe.slots.flatMap((slot) => slot.categories))];
    const totalWanted = recipe.slots.reduce((sum, slot) => sum + slot.limit, 0);

    const candidates = await this.store.search({
      embedding,
      text: queryText,
      limit: totalWanted * OVERFETCH,
      minSimilarity: recipe.minSimilarity,
      filter: {
        categories,
        status: ["active"],
        ...(request.platform ? { platforms: [request.platform] } : {}),
        ...(request.productType ? { productTypes: [request.productType] } : {}),
      },
    });

    const rerankScores = await this.reranker.rerank(queryText, candidates);
    const ranked = rankCandidates(candidates, rerankScores, recipe.weights, {
      ...(request.platform ? { platforms: [request.platform] } : {}),
      ...(request.productType ? { productTypes: [request.productType] } : {}),
    });
    const diversified = mmrSelect(ranked, recipe.mmrLambda, totalWanted);

    const slots = assignToSlots(diversified, recipe.slots);
    const selected = enforceBudget(slots, recipe.knowledgeTokenBudget);
    return { queryText, slots: rebuildSlots(slots, selected), selected };
  }
}

/** Assign each chunk to the first (lowest-order) slot whose categories match. */
function assignToSlots(
  chunks: readonly RankedChunk[],
  slots: readonly RetrievalSlot[],
): SlotResult[] {
  const ordered = [...slots].sort((a, b) => a.order - b.order);
  const results: SlotResult[] = ordered.map((slot) => ({ slot, chunks: [] }));
  const used = new Set<string>();

  for (const result of results) {
    const match = chunks.filter(
      (c) => !used.has(c.chunk.id) && result.slot.categories.includes(c.chunk.category),
    );
    for (const chunk of match.slice(0, result.slot.limit)) {
      result.chunks.push(chunk);
      used.add(chunk.chunk.id);
    }
  }
  return results;
}

/** Flatten in slot order and drop the tail that would exceed the token budget. */
function enforceBudget(slots: readonly SlotResult[], budget: number): RankedChunk[] {
  const flat = slots.flatMap((result) => result.chunks);
  return packByBudget(flat, budget, (chunk) => chunk.chunk.tokenCount);
}

function rebuildSlots(slots: readonly SlotResult[], kept: readonly RankedChunk[]): SlotResult[] {
  const keptIds = new Set(kept.map((c) => c.chunk.id));
  return slots.map((result) => ({
    slot: result.slot,
    chunks: result.chunks.filter((c) => keptIds.has(c.chunk.id)),
  }));
}
