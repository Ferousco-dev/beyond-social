import "server-only";

import { logger } from "@/lib/logger";

import { currentTrace, newSpanId, newTraceId, runWithTrace, type TraceContext } from "./trace";

/**
 * Times a child operation and logs it as its own span, parented to whatever
 * trace is currently running.
 *
 * This lives apart from `trace.ts` so that module stays dependency-free and the
 * logger can read trace state without an import cycle.
 */
export async function span<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const parent = currentTrace();
  const context: TraceContext = {
    traceId: parent?.traceId ?? newTraceId(),
    spanId: newSpanId(),
    parentSpanId: parent?.spanId,
    name,
  };
  const startedAt = performance.now();

  return runWithTrace(context, async () => {
    try {
      const result = await fn();
      logger.debug("span", { span: name, durationMs: Math.round(performance.now() - startedAt) });
      return result;
    } catch (error) {
      // Logged and rethrown: a span must never swallow the failure it describes.
      logger.error("span failed", {
        span: name,
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}
