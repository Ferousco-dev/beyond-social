import type { z } from "zod";

/**
 * Tool definitions and dispatch.
 *
 * A tool is a typed function the model may call. The schema describes the
 * tool to the model as prose (see `toolInstructions` in ./agent) rather than a
 * provider-native tool-call spec, and validates arguments on the way back,
 * because a model's arguments are untrusted input like any other.
 */

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly schema: z.ZodType<TInput>;
  readonly execute: (input: TInput) => Promise<TOutput> | TOutput;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResult {
  id: string;
  name: string;
  ok: boolean;
  content: string;
}

/** Builds a tool with its types tied together, so misuse is a compile error. */
export function defineTool<TInput, TOutput>(
  definition: ToolDefinition<TInput, TOutput>,
): ToolDefinition<TInput, TOutput> {
  return definition;
}

/**
 * Runs one tool call. Arguments are validated before execution, and both
 * validation and execution failures come back as results rather than throwing:
 * the model needs to see the error to correct itself on the next turn.
 */
export async function runToolCall(
  call: ToolCall,
  tools: readonly ToolDefinition<never, unknown>[],
): Promise<ToolResult> {
  const tool = tools.find((candidate) => candidate.name === call.name);
  if (!tool) {
    return { id: call.id, name: call.name, ok: false, content: `Unknown tool "${call.name}".` };
  }

  const parsed = (tool.schema as z.ZodType<unknown>).safeParse(call.input);
  if (!parsed.success) {
    return {
      id: call.id,
      name: call.name,
      ok: false,
      content: `Invalid arguments: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    };
  }

  try {
    const output = await tool.execute(parsed.data as never);
    return {
      id: call.id,
      name: call.name,
      ok: true,
      content: typeof output === "string" ? output : JSON.stringify(output),
    };
  } catch (error) {
    return {
      id: call.id,
      name: call.name,
      ok: false,
      content: `Tool failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
