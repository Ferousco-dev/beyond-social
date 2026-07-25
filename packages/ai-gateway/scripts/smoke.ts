/**
 * Behavioural smoke test for the gateway, run with fake providers so it needs no
 * API keys and no network. Exercises the three things that are easy to get
 * wrong: retrying transient failures, falling back across providers, and
 * accounting cost from real token counts.
 *
 *   tsx scripts/smoke.ts
 */
import { AiGateway } from "../src/gateway";
import { type CompletionResult, type ProviderClient } from "../src/providers";
import { TokenBucketLimiter, RateLimitedError } from "../src/rate-limit";
import { ProviderError } from "../src/retry";
import { MemoryUsageSink } from "../src/usage";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

/** Fails `failTimes` with a retryable status, then succeeds. */
function flaky(failTimes: number, tokens = 100): ProviderClient & { calls: number } {
  return {
    calls: 0,
    async complete(): Promise<CompletionResult> {
      this.calls += 1;
      if (this.calls <= failTimes) throw new ProviderError("rate limited", 429, 0);
      return { text: "ok", inputTokens: tokens, outputTokens: tokens };
    },
  };
}

/** Always fails terminally, so the gateway must move to the next provider. */
const broken: ProviderClient = {
  async complete(): Promise<CompletionResult> {
    throw new ProviderError("server error", 500);
  },
};

async function main(): Promise<void> {
  // 1. Retries a transient failure rather than surfacing it.
  const anthropic = flaky(2);
  const usage = new MemoryUsageSink();
  const gateway = new AiGateway({
    clients: { anthropic },
    usage,
    retry: { attempts: 3, baseDelayMs: 1, maxDelayMs: 2, sleep: async () => {}, random: () => 0 },
  });
  const first = await gateway.complete({ task: "generation", system: "s", messages: [] });
  check(
    "retries transient failures",
    first.text === "ok" && anthropic.calls === 3,
    `${anthropic.calls} calls`,
  );

  // 2. Cost is computed from the provider's reported tokens.
  // Opus: 100 in at $15/M + 100 out at $75/M = 0.0015 + 0.0075.
  const expected = (100 / 1e6) * 15 + (100 / 1e6) * 75;
  check(
    "computes cost from tokens",
    Math.abs(first.costUsd - expected) < 1e-9,
    first.costUsd.toFixed(6),
  );

  // 3. Falls back to another provider when the first is down.
  const openai = flaky(0, 50);
  const failover = new AiGateway({
    clients: { anthropic: broken, openai },
    usage,
    retry: { attempts: 2, baseDelayMs: 1, maxDelayMs: 2, sleep: async () => {}, random: () => 0 },
  });
  const second = await failover.complete({ task: "generation", system: "s", messages: [] });
  check(
    "falls back across providers",
    second.provider === "openai" && second.fallbacks > 0,
    `${second.provider} after ${second.fallbacks} fallback(s)`,
  );

  // 4. Every attempt is recorded, successes and failures alike.
  const failed = usage.all().filter((entry) => !entry.ok).length;
  check("records failed attempts too", failed > 0, `${failed} failure record(s)`);

  // 5. The limiter refuses once the bucket is empty.
  const limited = new AiGateway({
    clients: { anthropic: flaky(0) },
    limiter: new TokenBucketLimiter({ capacity: 5, refillPerSec: 0, now: () => 0 }),
  });
  let refused = false;
  try {
    await limited.complete({ task: "generation", system: "x".repeat(400), messages: [] });
  } catch (error) {
    refused = error instanceof RateLimitedError;
  }
  check("rate limits oversized requests", refused);

  // 6. A task with no configured provider fails loudly rather than silently.
  let explained = false;
  try {
    await new AiGateway({ clients: {} }).complete({ task: "judge", system: "s", messages: [] });
  } catch (error) {
    explained = error instanceof Error && error.message.includes("No model available");
  }
  check("explains missing providers", explained);

  process.stdout.write(`${results.join("\n")}\n`);
  process.stdout.write(
    `\n${results.length - failures}/${results.length} passed. Recorded spend: $${usage.totalCostUsd().toFixed(6)}\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
