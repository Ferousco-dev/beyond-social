/**
 * Behavioural smoke test for the generate-grade-revise loop, run with stub
 * models so it needs no API keys and no network.
 *
 * The loop existed for a long time with no caller and no test. What it does
 * when the judge misbehaves matters more than what it does when everything
 * works, because that is the path that decides whether quality control can
 * lower quality.
 *
 *   tsx scripts/engine-smoke.ts
 */
import { PromptEngine } from "../src/engine";
import { EVAL_DIMENSIONS } from "../src/schema/evaluation";
import { recipeSchema } from "../src/schema/recipe";
import type { Embedder, Llm, Reranker, ScoredChunk, VectorStore } from "../src/ports";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

/** A judge answer where every dimension scores `score`. */
function judgement(score: number, suggestions: string[] = []): string {
  return JSON.stringify({
    dimensions: EVAL_DIMENSIONS.map((dimension) => ({
      dimension,
      score,
      rationale: "stub",
    })),
    suggestions,
  });
}

/** Returns each scripted answer in turn, and records what it was asked. */
function scripted(answers: readonly string[]): Llm & { calls: number; last: string } {
  return {
    model: "stub",
    calls: 0,
    last: "",
    async complete(params): Promise<string> {
      const answer = answers[Math.min(this.calls, answers.length - 1)] ?? "";
      this.calls += 1;
      this.last = params.messages.map((message) => message.content).join("\n");
      return answer;
    },
  };
}

const embedder: Embedder = {
  model: "stub",
  async embed(texts: readonly string[]): Promise<number[][]> {
    return texts.map(() => [1, 0, 0]);
  },
};

/** No knowledge: this exercises the loop, not retrieval. */
const store: VectorStore = {
  async search(): Promise<ScoredChunk[]> {
    return [];
  },
  async upsert(): Promise<void> {},
  async getScores(): Promise<Map<string, never>> {
    return new Map();
  },
  async applyScores(): Promise<void> {},
  async deprecate(): Promise<void> {},
};

const reranker: Reranker = {
  model: "stub",
  async rerank(): Promise<Map<string, number>> {
    return new Map();
  },
};

const RECIPE = recipeSchema.parse({
  id: "test",
  version: 1,
  systemLayers: [],
  // One slot, because a recipe must have at least one. The store returns
  // nothing, so retrieval stays empty and this exercises the loop, not the RAG.
  slots: [{ name: "Foundations", categories: ["video-prompting"], limit: 2, order: 0 }],
});

const REQUEST = { prompt: "a coffee shop at dawn" };

function engineWith(
  generator: Llm,
  judge: Llm,
  onGradeError?: (error: unknown) => void,
): PromptEngine {
  return new PromptEngine({
    embedder,
    store,
    reranker,
    generator,
    judge,
    systemLayers: new Map(),
    ...(onGradeError ? { onGradeError } : {}),
    now: () => "2026-01-01T00:00:00.000Z",
    newId: () => "gen_1",
  });
}

async function main(): Promise<void> {
  // 1. A passing grade is accepted as it stands.
  {
    const generator = scripted(["first attempt"]);
    const judge = scripted([judgement(0.9)]);
    const result = await engineWith(generator, judge).generate("user", REQUEST, RECIPE);
    check(
      "a passing output is not regenerated",
      result.output === "first attempt" && result.regenerations === 0 && generator.calls === 1,
      `${generator.calls} generate call(s)`,
    );
  }

  // 2. A failing grade is revised once, and the revision is what comes back.
  {
    const generator = scripted(["weak attempt", "better attempt"]);
    const judge = scripted([judgement(0.2, ["Be more specific about the light"]), judgement(0.9)]);
    const result = await engineWith(generator, judge).generate("user", REQUEST, RECIPE);
    check(
      "a failing output is revised and the revision is used",
      result.output === "better attempt" && result.regenerations === 1,
      `${result.regenerations} regeneration(s)`,
    );
    check(
      "the critique is fed back into the revision",
      generator.last.includes("Be more specific about the light"),
    );
    check("the final grade is the one for the revision", result.evaluation?.passed === true);
  }

  // 3. The revision budget is respected even when the grade never improves.
  {
    const generator = scripted(["one", "two", "three", "four"]);
    const judge = scripted([judgement(0.1)]);
    const result = await engineWith(generator, judge).generate("user", REQUEST, RECIPE);
    check(
      "revision stops at the policy's limit",
      result.regenerations === RECIPE.evalPolicy.maxRegenerations,
      `${result.regenerations} of ${RECIPE.evalPolicy.maxRegenerations}`,
    );
  }

  /*
   * 4. An ungradeable output is kept.
   *
   * The judge is validated strictly, and a caller that fell back to an
   * unenhanced prompt because the *judge* answered with prose would have let
   * quality control lower quality. The artifact exists and is very likely fine.
   */
  {
    const generator = scripted(["a perfectly good prompt"]);
    const judge = scripted(["I think it is quite good, honestly"]);
    let reported = false;
    const result = await engineWith(generator, judge, () => {
      reported = true;
    }).generate("user", REQUEST, RECIPE);
    check(
      "an ungradeable output is kept rather than discarded",
      result.output === "a perfectly good prompt" && result.evaluation === null,
    );
    check(
      "an ungradeable output is not regenerated blind",
      result.regenerations === 0 && generator.calls === 1,
      `${generator.calls} generate call(s)`,
    );
    check("a failed grade is reported", reported);
    check("the record carries no invented score", result.record.evaluationScore === null);
  }

  // 5. Sampling and the output instruction reach the model.
  {
    const generator = scripted(["ok"]);
    const judge = scripted([judgement(0.9)]);
    await engineWith(generator, judge).generate("user", REQUEST, RECIPE, {
      instruction: "\n\nOutput only the prompt.",
      temperature: 0.7,
      maxTokens: 500,
    });
    check("the output instruction reaches the model", generator.last.includes("Output only the prompt."));
  }

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed.\n`,
  );
  if (failures > 0) process.exit(1);
}

await main();
