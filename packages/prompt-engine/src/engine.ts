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
  /**
   * Told when an output could not be graded, so a judge that has been answering
   * with nonsense all week is visible rather than merely ungraded.
   */
  onGradeError?: (error: unknown) => void;
  /** Injected so generation is deterministic under test and replayable. */
  now: () => string;
  newId: () => string;
}

export interface GenerateResult {
  output: string;
  /**
   * Null when the output could not be graded.
   *
   * The judge is asked for strict JSON and its answer is validated, so a
   * malformed reply is a real possibility. An ungradeable output is not a
   * failed generation: the artifact exists and is very likely fine, and
   * throwing it away because the second opinion was unreadable would make
   * quality control the thing that lowers quality.
   */
  evaluation: Evaluation | null;
  record: GenerationRecord;
  composed: ComposedPrompt;
  regenerations: number;
}

/**
 * How the artifact should be produced, as opposed to what it should be made of.
 *
 * Sampling and output shape are properties of a call, not of a recipe: the same
 * composition strategy is used to write a 500-token video prompt here and could
 * be used for something longer elsewhere, and neither belongs in a versioned
 * document about which knowledge to retrieve.
 */
export interface GenerateOptions {
  /** Appended to the composed user message, saying what shape to answer in. */
  instruction?: string;
  temperature?: number;
  maxTokens?: number;
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
    options: GenerateOptions = {},
  ): Promise<GenerateResult> {
    const request = generationRequestSchema.parse(rawRequest);
    const recipe = recipeSchema.parse(rawRecipe);
    const generationId = this.deps.newId();

    const retrieval = await this.retriever.retrieve(request, recipe);
    const composed = composePrompt(request, recipe, retrieval, this.deps.systemLayers);
    const task = options.instruction ? composed.user + options.instruction : composed.user;
    const sampling = {
      ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
      ...(options.maxTokens === undefined ? {} : { maxTokens: options.maxTokens }),
    };

    let output = await this.deps.generator.complete({
      system: composed.system,
      messages: [{ role: "user", content: task }],
      ...sampling,
    });
    let evaluation = await this.tryGrade(generationId, output, request, recipe);
    let regenerations = 0;

    // A null evaluation ends the loop: without a grade there is no critique to
    // revise against, and regenerating blind would spend a second call to
    // arrive somewhere no better.
    while (evaluation && !evaluation.passed && regenerations < recipe.evalPolicy.maxRegenerations) {
      output = await this.deps.generator.complete({
        system: composed.system,
        messages: [
          { role: "user", content: task },
          { role: "assistant", content: output },
          { role: "user", content: reviseInstruction(evaluation.suggestions) },
        ],
        ...sampling,
      });
      const regraded = await this.tryGrade(generationId, output, request, recipe);
      regenerations++;
      // Keeping the previous grade would report the revision as still failing
      // on issues it may well have fixed.
      evaluation = regraded;
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
      evaluationScore: evaluation?.overall ?? null,
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

  /**
   * The grade, or null when one could not be obtained.
   *
   * The evaluator is strict on purpose: a judge that answers with prose instead
   * of the schema has not graded anything, and pretending otherwise would put a
   * made-up score on the record. But strictness belongs to the grade, not to
   * the generation, and a caller that falls back to an unenhanced prompt when
   * the *judge* misbehaves has let quality control lower quality.
   */
  private async tryGrade(
    id: string,
    output: string,
    request: GenerationRequest,
    recipe: Recipe,
  ): Promise<Evaluation | null> {
    try {
      return await this.grade(id, output, request, recipe);
    } catch (error) {
      this.deps.onGradeError?.(error);
      return null;
    }
  }
}

function reviseInstruction(suggestions: readonly string[]): string {
  const list =
    suggestions.length > 0
      ? suggestions.map((s) => `- ${s}`).join("\n")
      : "- Raise overall quality.";
  return `Revise the previous output to address these issues, keeping what worked:\n${list}`;
}
