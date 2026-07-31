import { codeFromStatus, type ErrorCode } from "./codes";
import { errorCopy, type ErrorCopy } from "./copy";

/**
 * An error that already knows how it should be shown to a user.
 *
 * `message` stays the developer-facing detail that goes to the logs. What the
 * user reads comes from `copy`, derived from the code, so the same failure is
 * described the same way wherever it surfaces.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  /** Present when the failure came back from a traced request. */
  readonly traceId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { readonly traceId?: string; readonly cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.traceId = options?.traceId;
  }

  get copy(): ErrorCopy {
    return errorCopy(this.code);
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Normalises anything a `catch` can receive into an `AppError`.
 *
 * A caught value is genuinely `unknown` in JavaScript, and the alternative to
 * narrowing it here is every call site inventing its own guess at what it got.
 */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value;

  if (value instanceof Error) {
    // A failed `fetch` rejects with a TypeError and no status, which is the only
    // signal available that the request never left the machine.
    const code: ErrorCode = value.name === "AbortError" ? "timeout" : offline() ? "network" : "unknown";
    return new AppError(code, value.message, { cause: value });
  }

  return new AppError("unknown", typeof value === "string" ? value : "Non-error thrown", {
    cause: value,
  });
}

/** Status-only failures, for callers that never got a parsable body. */
export function statusError(status: number, traceId?: string): AppError {
  return new AppError(codeFromStatus(status), `HTTP ${status}`, { traceId });
}

function offline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
