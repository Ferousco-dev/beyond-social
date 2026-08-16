import { NextResponse } from "next/server";

import { guardApiRequest } from "@/lib/api/guard";
import { isFlagEnabled } from "@/lib/flags";
import { dispatch, ERROR_CODES, failure, parseRequest } from "@/lib/mcp/protocol";
import { withTrace } from "@/lib/observability/http";

/**
 * The MCP endpoint an AI agent connects to.
 *
 * Same key as the REST API and the same plan behind it, because it is the same
 * account being read: an agent holding a key can see exactly what a script
 * holding that key can see, and nothing else.
 *
 * Stateless, so there is no session to establish and no stream to hold open.
 * A client configures one URL and one bearer token.
 */
export const dynamic = "force-dynamic";

export const POST = withTrace("POST /api/mcp", async (request) => {
  // Shares the public API's kill switch. They are one integration surface, and
  // a problem bad enough to close one is bad enough to close both.
  if (!(await isFlagEnabled("public_api", true))) {
    return NextResponse.json(
      failure(null, ERROR_CODES.internal, "The API is temporarily unavailable."),
      { status: 503 },
    );
  }

  const guarded = await guardApiRequest(request);
  if (!guarded.ok) return guarded.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(failure(null, ERROR_CODES.parseError, "Invalid JSON."), {
      status: 400,
    });
  }

  // Batches are not accepted. The 2025-06-18 revision removed them, and
  // accepting an array here would mean supporting a shape the protocol no
  // longer has.
  const parsed = parseRequest(body);
  if (!parsed) {
    return NextResponse.json(
      failure(null, ERROR_CODES.invalidRequest, "Expected a single JSON-RPC 2.0 request."),
      { status: 400 },
    );
  }

  const response = await dispatch(parsed, guarded.caller.userId);

  // A notification is owed an acknowledgement and no body.
  if (response === null) return new NextResponse(null, { status: 202 });

  return NextResponse.json(response);
});

/**
 * The GET half of Streamable HTTP opens a server-to-client stream. This server
 * has nothing to push, so it says so plainly rather than holding a connection
 * open that will never carry anything.
 */
export const GET = withTrace("GET /api/mcp", async () => {
  return NextResponse.json(
    failure(null, ERROR_CODES.methodNotFound, "This MCP server is stateless. Use POST."),
    { status: 405, headers: { allow: "POST" } },
  );
});
