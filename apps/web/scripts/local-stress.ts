import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const apiUrl = process.env.API_URL ?? "";
const anonKey = process.env.PUBLISHABLE_KEY ?? process.env.ANON_KEY ?? "";
const databaseUrl = process.env.DB_URL ?? "";
const webUrl = process.env.STRESS_WEB_URL ?? "http://127.0.0.1:3000";
const accountCount = Number(process.env.STRESS_ACCOUNTS ?? 20);
const requestCount = Number(process.env.STRESS_REQUESTS ?? 300);
const concurrency = Number(process.env.STRESS_CONCURRENCY ?? 20);

function assertLocalUrl(value: string, label: string): URL {
  const url = new URL(value);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(
      `${label} must be local; refusing to create stress-test accounts on ${url.host}`,
    );
  }
  return url;
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

async function main(): Promise<void> {
  assertLocalUrl(apiUrl, "API_URL");
  assertLocalUrl(webUrl, "STRESS_WEB_URL");
  assertLocalUrl(databaseUrl, "DB_URL");
  if (!anonKey) throw new Error("A local Supabase publishable key is required");
  if (!Number.isInteger(accountCount) || accountCount < 1 || accountCount > 200) {
    throw new Error("STRESS_ACCOUNTS must be between 1 and 200");
  }

  const runId = crypto.randomUUID().slice(0, 8);
  const password = `Local-only-${crypto.randomUUID()}!aA1`;
  const userIds: string[] = [];
  let authFailures = 0;
  let readFailures = 0;

  try {
    for (let index = 0; index < accountCount; index += 1) {
      const email = `stress-${runId}-${index}@example.invalid`;
      const client = createClient(apiUrl, anonKey, { auth: { persistSession: false } });
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: `Stress ${index}` } },
      });
      if (error || !data.user)
        throw new Error(`Account creation failed at ${index}: ${error?.message}`);
      userIds.push(data.user.id);

      if (!data.session) authFailures += 1;
      const profile = await client
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile.error || profile.data?.id !== data.user.id) readFailures += 1;
    }

    const durations: number[] = [];
    let webFailures = 0;
    let nextRequest = 0;
    async function worker(): Promise<void> {
      while (nextRequest < requestCount) {
        nextRequest += 1;
        const started = performance.now();
        try {
          const response = await fetch(`${webUrl}/api/health`, { cache: "no-store" });
          if (!response.ok) webFailures += 1;
          await response.arrayBuffer();
        } catch {
          webFailures += 1;
        } finally {
          durations.push(performance.now() - started);
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    const report = {
      disposableAccounts: userIds.length,
      authFailures,
      profileReadFailures: readFailures,
      healthRequests: requestCount,
      concurrency,
      healthFailures: webFailures,
      latencyMs: {
        p50: Math.round(percentile(durations, 0.5)),
        p95: Math.round(percentile(durations, 0.95)),
        max: Math.round(Math.max(...durations)),
      },
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (authFailures + readFailures + webFailures > 0) process.exitCode = 1;
  } finally {
    if (userIds.length > 0) {
      const ids = userIds.map((id) => `'${id}'::uuid`).join(",");
      execFileSync(
        "psql",
        [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", `delete from auth.users where id in (${ids})`],
        {
          stdio: "ignore",
        },
      );
    }
  }
}

void main();
