import "server-only";

import { z } from "zod";

import { listGenerations, readCreditBalance, readUsage } from "@/lib/api/resources";

/**
 * What an agent connected over MCP can do.
 *
 * Read-only, deliberately. A tool that starts a render spends real money on
 * behalf of someone who is not watching, and the moment an agent can do that by
 * accident it will. Reading is the half that is safe to hand over now; writing
 * needs a confirmation path in the product before it needs a tool here.
 *
 * The handlers read through `lib/api/resources`, the same functions the REST
 * routes use, so the two surfaces cannot come to disagree about what a
 * generation looks like from outside.
 */

export interface McpTool {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** JSON Schema, which is what the protocol puts on the wire. */
  readonly inputSchema: Record<string, unknown>;
  /** Parses the agent's arguments; the schema above is only a description of this. */
  readonly parse: (args: unknown) => { ok: true; value: unknown } | { ok: false; message: string };
  readonly run: (userId: string, args: unknown) => Promise<unknown>;
}

/** Turns a zod schema into the pair of things a tool needs: a wire schema and a parser. */
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

const NO_ARGUMENTS = { type: "object", properties: {}, additionalProperties: false } as const;

export const MCP_TOOLS: readonly McpTool[] = [
  {
    name: "list_generations",
    title: "List videos",
    description:
      "The caller's video generations, newest first, with their status and a short-lived download link when one is ready.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 20,
          description: "How many to return.",
        },
      },
      additionalProperties: false,
    },
    parse: parser(listSchema),
    run: async (userId, args) => {
      const { limit } = args as z.infer<typeof listSchema>;
      const rows = await listGenerations(userId, limit);
      if (rows === null) throw new Error("Could not read generations");
      return { generations: rows };
    },
  },
  {
    name: "get_usage",
    title: "Get usage",
    description: "Rolled-up AI spend and volume for the caller over the last 30 days.",
    inputSchema: NO_ARGUMENTS,
    parse: parser(emptySchema),
    run: async (userId) => {
      const usage = await readUsage(userId);
      if (usage === null) throw new Error("Could not read usage");
      return { period_days: 30, usage: usage.usage };
    },
  },
  {
    name: "get_credit_balance",
    title: "Get credit balance",
    description:
      "Credits left on the account. A video costs between 3 and 60 depending on the model, so this is what decides whether another run is possible.",
    inputSchema: NO_ARGUMENTS,
    parse: parser(emptySchema),
    run: async (userId) => {
      const balance = await readCreditBalance(userId);
      if (balance === null) throw new Error("Could not read the balance");
      return { balance };
    },
  },
];

export function findTool(name: unknown): McpTool | undefined {
  return typeof name === "string" ? MCP_TOOLS.find((tool) => tool.name === name) : undefined;
}
