import { z } from "zod";

/**
 * Tool definitions and dispatch.
 *
 * A tool is a typed function the model may call. The schema is the contract in
 * both directions: it is sent to the provider so the model knows the shape, and
 * it validates arguments on the way back, because a model's arguments are
 * untrusted input like any other.
 */

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly schema: z.ZodType<TInput>;
  readonly execute: (input: TInput) => Promise<TOutput> | TOutput;
}

/** Wire format the providers expect. */
export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
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
 * Minimal JSON Schema for a Zod object, enough for the providers' tool APIs.
 * Deliberately small: richer conversion belongs in a dedicated library, and
 * guessing at unsupported constructs would produce schemas the model misreads.
 */
export function toJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  if (!(schema instanceof z.ZodObject)) {
    return { type: "object", properties: {}, additionalProperties: true };
  }

  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const unwrapped = value instanceof z.ZodOptional ? value.unwrap() : value;
    const description = value.description;

    let property: Record<string, unknown>;
    if (unwrapped instanceof z.ZodNumber) property = { type: "number" };
    else if (unwrapped instanceof z.ZodBoolean) property = { type: "boolean" };
    else if (unwrapped instanceof z.ZodEnum) {
      property = { type: "string", enum: unwrapped.options as string[] };
    } else if (unwrapped instanceof z.ZodArray) property = { type: "array", items: {} };
    else property = { type: "string" };

    if (description) property.description = description;
    properties[key] = property;
    if (!(value instanceof z.ZodOptional)) required.push(key);
  }

  return { type: "object", properties, required, additionalProperties: false };
}

export function toToolSpecs(tools: readonly ToolDefinition<never, unknown>[]): ToolSpec[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: toJsonSchema(tool.schema as z.ZodType<unknown>),
  }));
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
