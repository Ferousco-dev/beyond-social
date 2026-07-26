import { type AiGateway, type GatewayResponse } from "../gateway";
import { type Task } from "../models";
import { type ChatMessage } from "../providers";
import { runToolCall, type ToolCall, type ToolDefinition, type ToolResult } from "./tools";

/**
 * A bounded agent loop: think, call tools, observe, repeat until done.
 *
 * Every bound here exists because an unbounded loop is the failure mode that
 * costs real money. Steps are capped, spend is capped, and the loop stops the
 * moment the model stops asking for tools. Callers get the full transcript back
 * so a run can be inspected rather than trusted.
 */

export interface AgentStep {
  index: number;
  text: string;
  toolCalls: readonly ToolCall[];
  toolResults: readonly ToolResult[];
  costUsd: number;
}

export interface AgentRun {
  /** The model's final answer once it stopped calling tools. */
  output: string;
  steps: readonly AgentStep[];
  totalCostUsd: number;
  /** True when the loop hit a bound instead of finishing naturally. */
  stoppedEarly: boolean;
  stopReason: "complete" | "max-steps" | "budget";
}

export interface AgentOptions {
  gateway: AiGateway;
  task: Task;
  system: string;
  tools: readonly ToolDefinition<never, unknown>[];
  maxSteps?: number;
  /** Hard ceiling in USD across the whole run. */
  maxCostUsd?: number;
  userId?: string;
}

const DEFAULT_MAX_STEPS = 6;
const DEFAULT_MAX_COST = 0.5;

/**
 * Extracts tool calls from a completion.
 *
 * The gateway's provider clients return text rather than structured tool blocks,
 * so the contract is a JSON envelope the system prompt asks for. That keeps tool
 * use working identically across providers, at the cost of relying on the model
 * to emit valid JSON, which is why a parse failure is treated as "no tools" and
 * ends the loop rather than crashing it.
 */
export function parseToolCalls(text: string): { calls: ToolCall[]; clean: string } {
  const fence = /```json\s*([\s\S]*?)```/.exec(text);
  const candidate = fence?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return { calls: [], clean: text.trim() };

  try {
    const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
    if (typeof parsed !== "object" || parsed === null) return { calls: [], clean: text.trim() };
    const envelope = parsed as { tool_calls?: unknown };
    if (!Array.isArray(envelope.tool_calls)) return { calls: [], clean: text.trim() };

    const calls = envelope.tool_calls.flatMap((entry, index): ToolCall[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const record = entry as { name?: unknown; input?: unknown };
      if (typeof record.name !== "string") return [];
      return [{ id: `call_${index}`, name: record.name, input: record.input ?? {} }];
    });

    return { calls, clean: fence ? text.replace(fence[0], "").trim() : "" };
  } catch {
    return { calls: [], clean: text.trim() };
  }
}

/** Instructions appended so the model knows how to ask for a tool. */
export function toolInstructions(tools: readonly ToolDefinition<never, unknown>[]): string {
  const listed = tools.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n");
  return [
    "",
    "You may call tools. To do so, reply with only a fenced json block:",
    "```json",
    '{"tool_calls":[{"name":"tool_name","input":{...}}]}',
    "```",
    "Call tools only when you need them. When you have enough to answer, reply",
    "with the answer as plain prose and no json block.",
    "",
    "Available tools:",
    listed,
  ].join("\n");
}

export async function runAgent(prompt: string, options: AgentOptions): Promise<AgentRun> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const maxCost = options.maxCostUsd ?? DEFAULT_MAX_COST;

  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  const steps: AgentStep[] = [];
  let totalCostUsd = 0;
  let output = "";
  let stopReason: AgentRun["stopReason"] = "max-steps";

  for (let index = 0; index < maxSteps; index += 1) {
    const response: GatewayResponse = await options.gateway.complete({
      task: options.task,
      system: options.system + toolInstructions(options.tools),
      messages,
      temperature: 0,
      ...(options.userId === undefined ? {} : { userId: options.userId }),
    });

    totalCostUsd += response.costUsd;
    const { calls, clean } = parseToolCalls(response.text);

    // No tool calls means the model is answering, so the loop is done.
    if (calls.length === 0) {
      output = clean || response.text.trim();
      steps.push({
        index,
        text: output,
        toolCalls: [],
        toolResults: [],
        costUsd: response.costUsd,
      });
      stopReason = "complete";
      break;
    }

    const results = await Promise.all(calls.map((call) => runToolCall(call, options.tools)));
    steps.push({
      index,
      text: clean,
      toolCalls: calls,
      toolResults: results,
      costUsd: response.costUsd,
    });

    messages.push({ role: "assistant", content: response.text });
    messages.push({
      role: "user",
      content: results.map((result) => `Result of ${result.name}: ${result.content}`).join("\n"),
    });

    // Checked after the step so a run cannot overshoot the ceiling by a whole
    // extra call.
    if (totalCostUsd >= maxCost) {
      stopReason = "budget";
      break;
    }
  }

  return {
    output,
    steps,
    totalCostUsd,
    stoppedEarly: stopReason !== "complete",
    stopReason,
  };
}
