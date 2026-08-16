/**
 * What the MCP server offers, as description rather than behaviour.
 *
 * Separate from `tools.ts` because that file reaches the database and is
 * therefore server-only, while this list is also the documentation: the public
 * docs page renders it. One list, so a tool renamed in the server cannot leave
 * the page advertising a name that no longer answers.
 */

export interface McpToolSummary {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** JSON Schema for the arguments, which is what the protocol puts on the wire. */
  readonly inputSchema: Record<string, unknown>;
}

const NO_ARGUMENTS = { type: "object", properties: {}, additionalProperties: false } as const;

export const MCP_TOOL_SUMMARIES: readonly McpToolSummary[] = [
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
  },
  {
    name: "get_usage",
    title: "Get usage",
    description: "Rolled-up AI spend and volume for the caller over the last 30 days.",
    inputSchema: NO_ARGUMENTS,
  },
  {
    name: "get_credit_balance",
    title: "Get credit balance",
    description:
      "Credits left on the account. A video costs between 3 and 60 depending on the model, so this is what decides whether another run is possible.",
    inputSchema: NO_ARGUMENTS,
  },
];
