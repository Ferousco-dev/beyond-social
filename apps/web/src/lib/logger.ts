// Minimal structured logger. Emits one JSON line per event so logs are
// queryable in any aggregator (Datadog, Logtail, CloudWatch). Server-side only.

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

function emit(level: Level, message: string, context?: Context): void {
  const line = `${JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
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
