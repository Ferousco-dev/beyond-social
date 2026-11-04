import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped trace context.
 *
 * The point of a trace id is that one identifier appears on every line a single
 * request produced, across route handler, gateway call, and database work, so a
 * support report ("it failed at 04:12") becomes one log query rather than a
 * guess. `AsyncLocalStorage` is what makes that possible without threading a
 * context argument through every function signature.
 */

export interface TraceContext {
  readonly traceId: string;
  /** Identifies the current unit of work inside the trace. */
  readonly spanId: string;
  /** The span this one was started from, absent at the root. */
  readonly parentSpanId?: string;
  /** Stable name of the operation, e.g. `GET /api/v1/usage`. */
  readonly name: string;
}

const storage = new AsyncLocalStorage<TraceContext>();

/** The trace covering the current async call, if any. */
export function currentTrace(): TraceContext | undefined {
  return storage.getStore();
}
