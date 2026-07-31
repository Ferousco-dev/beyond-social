import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

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

/** W3C `traceparent` is 32 lowercase hex characters for the trace id. */
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

function hex(bytes: number): string {
  return randomUUID()
    .replace(/-/g, "")
    .slice(0, bytes * 2);
}

export function newTraceId(): string {
  return hex(16);
}

export function newSpanId(): string {
  return hex(8);
}

/**
 * Continues an upstream trace when the caller sent a valid `traceparent`, and
 * starts a new one otherwise. Ignoring a malformed header rather than failing is
 * deliberate: a broken tracing header must never break the request itself.
 */
export function traceFromHeaders(headers: Headers, name: string): TraceContext {
  const match = TRACEPARENT.exec(headers.get("traceparent") ?? "");
  const [, traceId, parentSpanId] = match ?? [];
  return traceId !== undefined
    ? { traceId, spanId: newSpanId(), parentSpanId, name }
    : { traceId: newTraceId(), spanId: newSpanId(), name };
}

/** The trace covering the current async call, if any. */
export function currentTrace(): TraceContext | undefined {
  return storage.getStore();
}

/** Runs `fn` with `context` visible to everything it awaits. */
export function runWithTrace<T>(context: TraceContext, fn: () => T): T {
  return storage.run(context, fn);
}

/**
 * Runs a server action inside a trace.
 *
 * Route handlers get this from `withTrace` in `http.ts`, which reads the
 * incoming headers. A server action has no `Request` to read, so it starts its
 * own root trace. Without this the actions that do the most interesting work,
 * sending a message and starting a generation, produced log lines with no id on
 * them at all.
 */
export function withActionTrace<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return runWithTrace({ traceId: newTraceId(), spanId: newSpanId(), name }, fn);
}

/**
 * The current trace formatted as a W3C `traceparent`, for handing to something
 * outside this process.
 *
 * `01` is the sampled flag: everything is sampled, because at this volume the
 * failures are rare enough that discarding any of them is the expensive choice.
 * Returns null outside a trace rather than inventing one, so a caller cannot
 * accidentally start a trace that corresponds to no request.
 */
export function traceparent(): string | null {
  const context = currentTrace();
  return context ? `00-${context.traceId}-${context.spanId}-01` : null;
}
