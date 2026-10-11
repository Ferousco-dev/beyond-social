/**
 * Trace correlation for the edge functions.
 *
 * Generating a video crosses four processes: the web app asks, this runtime
 * submits, kie.ai renders, and a second function finishes the job minutes later
 * on a callback. Each logged its own view of that and nothing joined them, so a
 * failed render could not be traced back to the request that asked for it.
 *
 * The web app sends a W3C `traceparent`. We keep the trace id, put it on the
 * generation row, and read it back in the callback, which is what carries the
 * id across the asynchronous gap where a header cannot reach.
 */

/** 32 lowercase hex characters, per the W3C spec. */
const TRACEPARENT = /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/;

/**
 * The incoming trace id, or null when there is no usable one.
 *
 * A malformed header is ignored rather than rejected: broken telemetry must
 * never fail the request it was describing.
 */
export function traceIdFrom(req: Request): string | null {
  const match = TRACEPARENT.exec(req.headers.get("traceparent") ?? "");
  return match?.[1] ?? null;
}

/**
 * One structured line, shaped like the web app's logger so both ends land in the
 * same query.
 */
export function log(
  level: "info" | "warn" | "error",
  message: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "info") console.log(line);
  else console.error(line);
}
