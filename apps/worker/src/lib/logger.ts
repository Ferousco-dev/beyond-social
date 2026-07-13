import { env } from "../config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

type LogContext = Record<string, unknown>;

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[env.LOG_LEVEL]) {
    return;
  }

  const line = `${JSON.stringify({ level, time: new Date().toISOString(), message, ...context })}\n`;

  // Warnings and errors go to stderr so log collectors can split severity;
  // everything else is structured JSON on stdout.
  const stream = level === "warn" || level === "error" ? process.stderr : process.stdout;
  stream.write(line);
}

export const logger = {
  debug: (message: string, context?: LogContext): void => emit("debug", message, context),
  info: (message: string, context?: LogContext): void => emit("info", message, context),
  warn: (message: string, context?: LogContext): void => emit("warn", message, context),
  error: (message: string, context?: LogContext): void => emit("error", message, context),
};
