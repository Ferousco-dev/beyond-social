type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

/**
 * Structured lines, one JSON object each.
 *
 * The same shape as the publish worker's logger beside it, so both services
 * read the same way in whatever collects them. Written to the streams directly
 * rather than through `console`: a render host ships stdout somewhere, and a
 * mix of prose and JSON is the thing that makes those logs unsearchable.
 *
 * No level filter here. This process logs once per claim and once per finished
 * job, which is a handful of lines an hour, so there is nothing to turn down.
 */
function emit(level: LogLevel, message: string, context?: LogContext): void {
  const line = `${JSON.stringify({ level, time: new Date().toISOString(), message, ...context })}\n`;

  // Warnings and errors to stderr so a collector can split severity without
  // parsing the payload.
  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  stream.write(line);
}

export const logger = {
  info: (message: string, context?: LogContext): void => emit("info", message, context),
  warn: (message: string, context?: LogContext): void => emit("warn", message, context),
  error: (message: string, context?: LogContext): void => emit("error", message, context),
};
