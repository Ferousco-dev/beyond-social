import "server-only";

import { logger } from "@/lib/logger";

import { runWithTrace, traceFromHeaders } from "./trace";

/** The header a client can read to quote a trace id in a support report. */
export const TRACE_HEADER = "x-trace-id";

type Handler = (request: Request) => Promise<Response>;

/**
 * Wraps a route handler so every log line it produces carries a trace id, the
 * outcome is logged once with its duration, and the id comes back on the
 * response.
 *
 * A thrown handler is turned into a 500 rather than left to the framework,
 * because an unhandled throw loses the trace id and with it the ability to find
 * the failure in the logs.
 */
export function withTrace(name: string, handler: Handler): Handler {
  return async (request) => {
    const context = traceFromHeaders(request.headers, name);
    const startedAt = performance.now();

    return runWithTrace(context, async () => {
      const finish = (status: number, level: "info" | "error"): void => {
        // `name` is not repeated here: the logger already emits it as `span`.
        logger[level]("request", {
          method: request.method,
          status,
          durationMs: Math.round(performance.now() - startedAt),
        });
      };

      try {
        const response = await handler(request);
        finish(response.status, response.status >= 500 ? "error" : "info");
        // Headers are immutable on some responses, so clone rather than mutate.
        const headers = new Headers(response.headers);
        headers.set(TRACE_HEADER, context.traceId);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (error) {
        finish(500, "error");
        logger.error("unhandled route error", {
          route: name,
          error: error instanceof Error ? error.message : String(error),
        });
        return Response.json(
          { error: "internal_error", message: "Something went wrong.", trace_id: context.traceId },
          { status: 500, headers: { [TRACE_HEADER]: context.traceId } },
        );
      }
    });
  };
}
