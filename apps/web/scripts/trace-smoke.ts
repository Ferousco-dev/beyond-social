/**
 * Behaviour checks for request tracing. Runs in plain Node with no server and
 * no keys: the point is to prove correlation actually happens, which reading
 * log output by hand cannot establish.
 *
 *   tsx scripts/trace-smoke.ts
 */
import { TRACE_HEADER, withTrace } from "../src/lib/observability/http";
import {
  currentTrace,
  newSpanId,
  newTraceId,
  runWithTrace,
  traceFromHeaders,
} from "../src/lib/observability/trace";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

/** Captures stdout and stderr so emitted log lines can be asserted on. */
function captureLogs(): { lines: () => Record<string, unknown>[]; restore: () => void } {
  const captured: Record<string, unknown>[] = [];
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  const take = (chunk: string | Uint8Array): boolean => {
    try {
      captured.push(JSON.parse(String(chunk)) as Record<string, unknown>);
    } catch {
      /* not a structured line */
    }
    return true;
  };
  process.stdout.write = take as typeof process.stdout.write;
  process.stderr.write = take as typeof process.stderr.write;
  return {
    lines: () => captured,
    restore: () => {
      process.stdout.write = out;
      process.stderr.write = err;
    },
  };
}

const HEX32 = /^[0-9a-f]{32}$/;
const UPSTREAM = "abcdef01234567890abcdef012345678";

// Ids must be W3C-shaped, or a downstream collector silently drops the trace.
check("trace ids are 32 hex chars", HEX32.test(newTraceId()), newTraceId());
check("span ids are 16 hex chars", /^[0-9a-f]{16}$/.test(newSpanId()));

// An upstream traceparent must be continued, not replaced, or a trace breaks in
// two at every service hop.
const continued = traceFromHeaders(
  new Headers({ traceparent: `00-${UPSTREAM}-1111111111111111-01` }),
  "GET /x",
);
check("continues an upstream trace", continued.traceId === UPSTREAM);
check("parents to the upstream span", continued.parentSpanId === "1111111111111111");

// A malformed header must never break the request.
const malformed = traceFromHeaders(new Headers({ traceparent: "garbage" }), "GET /x");
check(
  "ignores a malformed traceparent",
  HEX32.test(malformed.traceId) && malformed.traceId !== UPSTREAM,
);

// Context must survive an await, which is the whole reason for AsyncLocalStorage.
const survived = await runWithTrace(
  { traceId: UPSTREAM, spanId: "2222222222222222", name: "t" },
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return currentTrace()?.traceId;
  },
);
check("context survives an await", survived === UPSTREAM);

// Concurrent requests must not see each other's trace.
const [a, b] = await Promise.all(
  ["a".repeat(32), "b".repeat(32)].map((id) =>
    runWithTrace({ traceId: id, spanId: newSpanId(), name: "t" }, async () => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
      return currentTrace()?.traceId;
    }),
  ),
);
check("concurrent traces stay isolated", a === "a".repeat(32) && b === "b".repeat(32));

// The wrapper must echo the id back and log the outcome with the same id.
{
  const handler = withTrace("GET /test", async () => Response.json({ ok: true }));
  const capture = captureLogs();
  const response = await handler(
    new Request("https://x.test/test", {
      headers: { traceparent: `00-${UPSTREAM}-3333333333333333-01` },
    }),
  );
  capture.restore();
  const line = capture.lines().find((l) => l.message === "request");
  check("echoes the trace id on the response", response.headers.get(TRACE_HEADER) === UPSTREAM);
  check("logs the request with the same trace id", line?.traceId === UPSTREAM);
  check("logs the status", line?.status === 200);
}

// A thrown handler must become a 500 that still carries the trace id, rather
// than an untraceable framework error.
{
  const handler = withTrace("GET /boom", async () => {
    throw new Error("boom");
  });
  const capture = captureLogs();
  const response = await handler(new Request("https://x.test/boom"));
  const body = (await response.json()) as { trace_id?: string };
  capture.restore();
  check("converts a throw to a 500", response.status === 500);
  check(
    "keeps the trace id on a thrown request",
    typeof body.trace_id === "string" && body.trace_id === response.headers.get(TRACE_HEADER),
  );
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
