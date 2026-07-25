import type { Llm } from "../ports";
import type { EvalPolicy, Evaluation } from "../schema/evaluation";
import { buildJudgePrompt, computeOverall, judgeResponseSchema, passesPolicy } from "./rubric";

/**
 * LLM-as-judge evaluator. It scores an output on the rubric, then WE compute the
 * aggregate and pass/fail from the versioned policy, so the gate is deterministic
 * and auditable rather than left to the model. The judge is instructed to return
 * strict JSON, which we validate before trusting; a malformed judge response
 * throws rather than silently passing a bad output.
 */
export class Evaluator {
  constructor(private readonly judge: Llm) {}

  async evaluate(
    generationId: string,
    output: string,
    brief: string,
    policy: EvalPolicy,
    now: string,
  ): Promise<Evaluation> {
    const raw = await this.judge.complete({
      system: "You are a rigorous, fair principal design critic. Output strict JSON only.",
      messages: [{ role: "user", content: buildJudgePrompt(output, brief) }],
      temperature: 0,
      json: true,
    });

    const parsed = judgeResponseSchema.parse(safeJson(raw));
    const overall = computeOverall(parsed.dimensions, policy);
    return {
      generationId,
      dimensions: parsed.dimensions,
      overall,
      passed: passesPolicy(parsed.dimensions, overall, policy),
      suggestions: parsed.suggestions,
      judgeModel: this.judge.model,
      createdAt: now,
    };
  }
}

function safeJson(raw: string): unknown {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Judge did not return JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}
