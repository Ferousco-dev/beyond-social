import { composePrompt, type ComposedPrompt } from "./compose/composer";
import { Evaluator } from "./evaluation/evaluator";
import { attributeFeedback } from "./feedback/attribution";
import type { Embedder, Llm, Reranker, VectorStore } from "./ports";
import { Retriever } from "./retrieval/pipeline";
import {
  generationRequestSchema,
  type FeedbackEvent,
  type GenerationRecord,
  type GenerationRequest,
} from "./schema/feedback";
import type { Evaluation } from "./schema/evaluation";
import { recipeSchema, type Recipe } from "./schema/recipe";

export interface PromptEngineDeps {
  embedder: Embedder;
  store: VectorStore;
  reranker: Reranker;
  /** Model used to produce the artifact (default: latest Opus via ClaudeLlm). */
  generator: Llm;
  /** Model used to grade it (a cheaper model is fine and usually better value). */
  judge: Llm;
  systemLayers: ReadonlyMap<string, string>;
  /** Injected so generation is deterministic under test and replayable. */
  now: () => string;
  newId: () => string;
}

export interface GenerateResult {
  output: string;
  evaluation: Evaluation;
  record: GenerationRecord;
  composed: ComposedPrompt;
  regenerations: number;
}

/**
 * The orchestrator. One `generate` call retrieves knowledge, composes the
 * prompt, produces an artifact, grades it against the recipe's policy, and
 * regenerates (feeding the critique back in) until it passes or the budget is
 * spent. Every call returns a fully-populated record so the caller can persist
 * it and, later, attribute the outcome back to the chunks that shaped it.
 */
export class PromptEngine {
  private readonly retriever: Retriever;
  private readonly evaluator: Evaluator;

  constructor(private readonly deps: PromptEngineDeps) {
    this.retriever = new Retriever(deps.embedder, deps.store, deps.reranker);
    this.evaluator = new Evaluator(deps.judge);
  }

  async generate(
    userId: string,
    rawRequest: GenerationRequest,
    rawRecipe: Recipe,
  ): Promise<GenerateResult> {
    const request = generationRequestSchema.parse(rawRequest);
    const recipe = recipeSchema.parse(rawRecipe);
    const generationId = this.deps.newId();

    const retrieval = await this.retriever.retrieve(request, recipe);
    const composed = composePrompt(request, recipe, retrieval, this.deps.systemLayers);

    let output = await this.deps.generator.complete({
      system: composed.system,
      messages: [{ role: "user", content: composed.user }],
    });
    let evaluation = await this.grade(generationId, output, request, recipe);
    let regenerations = 0;

    while (!evaluation.passed && regenerations < recipe.evalPolicy.maxRegenerations) {
      output = await this.deps.generator.complete({
        system: composed.system,
        messages: [
          { role: "user", content: composed.user },
          { role: "assistant", content: output },
          { role: "user", content: reviseInstruction(evaluation.suggestions) },
        ],
      });
      evaluation = await this.grade(generationId, output, request, recipe);
      regenerations++;
    }

    const record: GenerationRecord = {
      id: generationId,
      userId,
      request,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      retrievedChunks: composed.chunkRefs.map((ref) => ({ id: ref.id, version: ref.version })),
      llmModel: this.deps.generator.model,
      outputRef: null,
      outcome: null,
      editDistance: null,
      evaluationScore: evaluation.overall,
      createdAt: this.deps.now(),
    };

    return { output, evaluation, record, composed, regenerations };
  }

  /** Apply a user outcome to every chunk that shaped the generation. */
  async recordFeedback(event: FeedbackEvent): Promise<void> {
    const current = await this.deps.store.getScores(event.chunkIds);
    const updated = attributeFeedback(event, current);
    await this.deps.store.applyScores(updated);
  }

  private grade(
    id: string,
    output: string,
    request: GenerationRequest,
    recipe: Recipe,
  ): Promise<Evaluation> {
    return this.evaluator.evaluate(id, output, request.prompt, recipe.evalPolicy, this.deps.now());
  }
}

function reviseInstruction(suggestions: readonly string[]): string {
  const list =
    suggestions.length > 0
      ? suggestions.map((s) => `- ${s}`).join("\n")
      : "- Raise overall quality.";
  return `Revise the previous output to address these issues, keeping what worked:\n${list}`;
}
