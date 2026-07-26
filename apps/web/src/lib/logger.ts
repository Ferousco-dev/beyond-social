// Minimal structured logger. Emits one JSON line per event so logs are
// queryable in any aggregator (Datadog, Logtail, CloudWatch). Server-side only.

import { currentTrace } from "@/lib/observability/trace";

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

function emit(level: Level, message: string, context?: Context): void {
  // Trace fields are merged in here rather than at each call site, so a line is
  // correlatable even from code that knows nothing about tracing.
  const trace = currentTrace();
  const line = `${JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...(trace ? { traceId: trace.traceId, spanId: trace.spanId, span: trace.name } : {}),
    ...context,
  })}\n`;
  // Write to the raw streams (not console) so the structured line is never
  // reformatted; aggregators route on the `level` field, not the stream.
  if (level === "error" || level === "warn") process.stderr.write(line);
  else process.stdout.write(line);
}

export const logger = {
  debug: (message: string, context?: Context) => emit("debug", message, context),
  info: (message: string, context?: Context) => emit("info", message, context),
  warn: (message: string, context?: Context) => emit("warn", message, context),
  error: (message: string, context?: Context) => emit("error", message, context),
};
