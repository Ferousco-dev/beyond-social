import "server-only";

import { z } from "zod";

import { listGenerations, readCreditBalance, readUsage } from "@/lib/api/resources";

import { MCP_TOOL_SUMMARIES, type McpToolSummary } from "./catalogue";

/**
 * What an agent connected over MCP can actually do.
 *
 * Read-only, deliberately. A tool that starts a render spends real money on
 * behalf of someone who is not watching, and the moment an agent can do that by
 * accident it will. Reading is the half that is safe to hand over now; writing
 * needs a confirmation path in the product before it needs a tool here.
 *
 * The handlers read through `lib/api/resources`, the same functions the REST
 * routes use, so the two surfaces cannot come to disagree about what a
 * generation looks like from outside. What each tool is called and says lives in
 * `catalogue.ts`, which the public docs page renders.
 */

export interface McpTool extends McpToolSummary {
  /** Parses the agent's arguments; the schema in the summary describes this. */
  readonly parse: (args: unknown) => { ok: true; value: unknown } | { ok: false; message: string };
  readonly run: (userId: string, args: unknown) => Promise<unknown>;
}

/** Turns a zod schema into the parser a tool call runs its arguments through. */
function parser<T extends z.ZodTypeAny>(schema: T): McpTool["parse"] {
  return (args) => {
    const parsed = schema.safeParse(args ?? {});
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid arguments" };
  };
}

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const emptySchema = z.object({}).strip();

/**
 * Behaviour, keyed by tool name. Kept beside the catalogue rather than merged
 * into it so the catalogue stays importable from anywhere, including the
 * browser bundle the docs page ships.
 */
const BEHAVIOUR: Record<string, Pick<McpTool, "parse" | "run">> = {
  list_generations: {
    parse: parser(listSchema),
    run: async (userId, args) => {
      const { limit } = args as z.infer<typeof listSchema>;
      const rows = await listGenerations(userId, limit);
      if (rows === null) throw new Error("Could not read generations");
      return { generations: rows };
    },
  },
  get_usage: {
    parse: parser(emptySchema),
    run: async (userId) => {
      const usage = await readUsage(userId);
      if (usage === null) throw new Error("Could not read usage");
      return { period_days: 30, usage: usage.usage };
    },
  },
  get_credit_balance: {
    parse: parser(emptySchema),
    run: async (userId) => {
      const balance = await readCreditBalance(userId);
      if (balance === null) throw new Error("Could not read the balance");
      return { balance };
    },
  },
};

export const MCP_TOOLS: readonly McpTool[] = MCP_TOOL_SUMMARIES.flatMap((summary) => {
  const behaviour = BEHAVIOUR[summary.name];
  // A described tool with no implementation is not offered at all. Listing one
  // an agent cannot call is worse than not listing it.
  return behaviour ? [{ ...summary, ...behaviour }] : [];
});

export function findTool(name: unknown): McpTool | undefined {
  return typeof name === "string" ? MCP_TOOLS.find((tool) => tool.name === name) : undefined;
}
