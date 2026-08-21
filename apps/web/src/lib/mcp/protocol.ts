import "server-only";

import { z } from "zod";

import { findTool, MCP_TOOLS } from "./tools";

/**
 * Model Context Protocol, over one HTTP endpoint.
 *
 * MCP is JSON-RPC 2.0, and this server is stateless: every request carries its
 * own API key, nothing is remembered between them, and no session id is issued.
 * That rules out server-initiated messages, which is why there is no SSE stream
 * here, and it is the right trade for a read-only server behind a bearer token.
 *
 * Written against the protocol rather than pulled in as a dependency. The
 * handled surface is four methods; an SDK would be a larger supply-chain
 * commitment than the thing it implements.
 */

/** The revision this server speaks. Echoed back so a client can refuse to proceed. */
export const PROTOCOL_VERSION = "2025-06-18";

export const SERVER_INFO = { name: "beyond-social", version: "1.0.0" } as const;

const requestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  // Absent on a notification, which is the difference that decides whether a
  // reply is owed at all.
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
});

export type JsonRpcRequest = z.infer<typeof requestSchema>;

export const ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
} as const;

export interface JsonRpcResult {
  jsonrpc: "2.0";
  id: string | number;
  result: unknown;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string };
}

export function parseRequest(body: unknown): JsonRpcRequest | null {
  const parsed = requestSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export function failure(id: string | number | null, code: number, message: string): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function result(id: string | number, value: unknown): JsonRpcResult {
  return { jsonrpc: "2.0", id, result: value };
}

/**
 * Runs one request and returns what to send back, or null for a notification,
 * which by the spec is answered with an acknowledgement and no body.
 */
export async function dispatch(
  request: JsonRpcRequest,
  userId: string,
): Promise<JsonRpcResult | JsonRpcFailure | null> {
  const { id, method } = request;

  // Notifications carry no id and expect no reply. `initialized` is the only
  // one a client of a stateless server sends, but any of them is answered the
  // same way: acknowledged, not replied to.
  if (id === undefined) return null;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        // Only tools. Declaring resources or prompts we do not serve would have
        // clients list them and find nothing.
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "Read-only access to a Beyond Social account: its video generations, AI usage, and credit balance.",
      });

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, {
        tools: MCP_TOOLS.map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });

    case "tools/call":
      return callTool(id, request.params, userId);

    default:
      return failure(id, ERROR_CODES.methodNotFound, `Unknown method: ${method}`);
  }
}

const callSchema = z.object({ name: z.string(), arguments: z.unknown().optional() });

async function callTool(
  id: string | number,
  params: unknown,
  userId: string,
): Promise<JsonRpcResult | JsonRpcFailure> {
  const parsed = callSchema.safeParse(params);
  if (!parsed.success) {
    return failure(id, ERROR_CODES.invalidParams, "A tool call needs a name.");
  }

  const tool = findTool(parsed.data.name);
  if (!tool) {
    return failure(id, ERROR_CODES.invalidParams, `Unknown tool: ${parsed.data.name}`);
  }

  const args = tool.parse(parsed.data.arguments);
  if (!args.ok) return failure(id, ERROR_CODES.invalidParams, args.message);

  /*
   * A tool that throws is reported inside the result, not as a JSON-RPC error.
   * The distinction is the protocol's: transport-level errors are the server
   * failing to run the tool, `isError` is the tool running and failing, and an
   * agent can only react sensibly to the second if we do not report it as the
   * first.
   */
  try {
    const value = await tool.run(userId, args.value);
    return result(id, {
      content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
      structuredContent: value,
      isError: false,
    });
  } catch (error) {
    return result(id, {
      content: [
        { type: "text", text: error instanceof Error ? error.message : "The tool failed." },
      ],
      isError: true,
    });
  }
}
