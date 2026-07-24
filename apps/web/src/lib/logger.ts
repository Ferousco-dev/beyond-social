// Minimal structured logger. Emits one JSON line per event so logs are
// queryable in any aggregator (Datadog, Logtail, CloudWatch). Server-side only.

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

function emit(level: Level, message: string, context?: Context): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Context) => emit("debug", message, context),
  info: (message: string, context?: Context) => emit("info", message, context),
  warn: (message: string, context?: Context) => emit("warn", message, context),
  error: (message: string, context?: Context) => emit("error", message, context),
};
