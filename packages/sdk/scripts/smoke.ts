/**
 * SDK behaviour checks against a stub server, so no keys or network are needed.
 *
 *   tsx scripts/smoke.ts
 */
import { BeyondSocial, BeyondSocialError } from "../src/index";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

/** Minimal fetch stub driven by a handler. */
function stub(handler: (url: URL) => Response): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL) =>
    handler(new URL(String(input)))) as typeof globalThis.fetch;
}

async function main(): Promise<void> {
  const ok = new BeyondSocial({
    apiKey: "bsk_test",
    baseUrl: "https://example.test/api/v1",
    fetch: stub((url) => {
      if (url.pathname.endsWith("/generations")) {
        return new Response(
          JSON.stringify({
            object: "list",
            data: [
              {
                id: "g1",
                prompt: "p",
                status: "ready",
                result_url: null,
                aspect_ratio: "9:16",
                created_at: "2026-01-01T00:00:00Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          object: "usage",
          data: {
            calls: 3,
            cached_calls: 1,
            failed_calls: 0,
            input_tokens: 10,
            output_tokens: 5,
            cost_usd: 0.01,
            p50_latency_ms: 120,
          },
        }),
        { status: 200 },
      );
    }),
  });

  const generations = await ok.listGenerations({ limit: 5 });
  check("lists generations", generations.length === 1 && generations[0]?.id === "g1");

  const usage = await ok.getUsage();
  check("reads usage", usage?.calls === 3, `${usage?.calls} calls`);

  // The limit must reach the wire, or paging silently does nothing.
  let seen: string | null = null;
  const paged = new BeyondSocial({
    apiKey: "bsk_test",
    baseUrl: "https://example.test/api/v1",
    fetch: stub((url) => {
      seen = url.searchParams.get("limit");
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }),
  });
  await paged.listGenerations({ limit: 42 });
  check("sends the limit parameter", seen === "42", String(seen));

  // Errors must preserve status and code so callers can branch.
  const failing = new BeyondSocial({
    apiKey: "bsk_bad",
    baseUrl: "https://example.test/api/v1",
    fetch: stub(
      () =>
        new Response(JSON.stringify({ error: "unauthorized", message: "nope" }), { status: 401 }),
    ),
  });
  let unauthorized = false;
  try {
    await failing.listGenerations();
  } catch (error) {
    unauthorized =
      error instanceof BeyondSocialError && error.status === 401 && error.code === "unauthorized";
  }
  check("surfaces auth errors", unauthorized);

  // 429 must expose Retry-After so a client can back off correctly.
  const limited = new BeyondSocial({
    apiKey: "bsk_test",
    baseUrl: "https://example.test/api/v1",
    fetch: stub(
      () =>
        new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { "retry-after": "7" },
        }),
    ),
  });
  let backoff: number | null = null;
  try {
    await limited.getUsage();
  } catch (error) {
    if (error instanceof BeyondSocialError) backoff = error.retryAfterSeconds;
  }
  check("exposes retry-after on 429", backoff === 7, `${backoff}s`);

  // A missing key is a programming error, caught immediately.
  let rejected = false;
  try {
    new BeyondSocial({ apiKey: "" });
  } catch {
    rejected = true;
  }
  check("requires an api key", rejected);

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
