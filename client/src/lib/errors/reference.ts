import { isAppError } from "./app-error";

/**
 * The identifier a user quotes in a support report.
 *
 * `trace` is the good one: it is the same id on every log line the failing
 * request produced, so the report becomes one query. `digest` is Next's own hash
 * of a server error, which is all that survives to the browser in production
 * when the failure happened during render, and is still enough to find the
 * matching server log.
 */
export interface ErrorReference {
  readonly kind: "trace" | "digest";
  readonly value: string;
}

/** 32 lowercase hex, per the W3C trace id in `lib/observability/trace.ts`. */
const TRACE_ID = /^[0-9a-f]{32}$/;

/**
 * Returns nothing when there is no id, rather than inventing one. A reference
 * that does not appear in any log is worse than no reference: it sends whoever
 * receives it looking for something that was never written.
 */
export function errorReference(error: unknown): ErrorReference | null {
  if (isAppError(error) && error.traceId !== undefined && TRACE_ID.test(error.traceId)) {
    return { kind: "trace", value: error.traceId };
  }

  if (error instanceof Error) {
    const { digest } = error as Error & { digest?: unknown };
    if (typeof digest === "string" && digest.length > 0) return { kind: "digest", value: digest };
  }

  return null;
}
