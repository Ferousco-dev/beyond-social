/**
 * Verifies the publish queue's retry/backoff behaviour against real BullMQ
 * machinery and a real Redis, not just a read of the config.
 *
 * Two things are checked:
 *   1. A platform call that fails with a retryable status (500) is retried
 *      by BullMQ the configured number of times, spaced by the configured
 *      exponential backoff.
 *   2. A platform call that fails with a permanent status (401) is thrown as
 *      the real code throws it -- via PermanentPublishError -> UnrecoverableError
 *      -- and BullMQ honours that by not retrying at all, regardless of the
 *      configured attempts.
 *
 * The processor's error classification (PermanentPublishError -> throw
 * UnrecoverableError, else rethrow) is copied verbatim from
 * apps/worker/src/processors/publish-post.ts (lines ~151-159). Everything
 * around it -- the Supabase claim, the video lookup -- is orthogonal to BullMQ
 * retry mechanics and is not re-created here. The platform call itself is the
 * real TikTokPublisher hitting a stubbed fetch, the same technique
 * scripts/publish-smoke.ts uses.
 *
 * Requires a real Redis reachable at REDIS_URL. Run:
 *   REDIS_URL=redis://127.0.0.1:6399 tsx scripts/retry-verification.ts
 */
import { Queue, UnrecoverableError, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";

import { createPublishQueue } from "../src/queues/publishing";
import { TikTokPublisher } from "../src/lib/platforms/tiktok";
import { PermanentPublishError } from "../src/lib/platforms/types";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("REDIS_URL is not set. This test needs a real Redis; refusing to fake the result.");
  process.exit(1);
}

interface TestJobData {
  mockStatus: number;
}

const connection = () => new Redis(REDIS_URL!, { maxRetriesPerRequest: null });

/** Same classification the real processor applies around publishPost(). */
async function runPublishAttempt(mockStatus: number): Promise<void> {
  const fetchStub = (async () =>
    new Response(JSON.stringify({ error: "stubbed failure" }), { status: mockStatus })) as typeof fetch;

  try {
    await new TikTokPublisher(fetchStub).publish({
      videoUrl: "https://cdn.test/render.mp4",
      caption: "retry verification",
      accessToken: "token",
      accountId: "acct_1",
    });
  } catch (error) {
    if (error instanceof PermanentPublishError) {
      throw new UnrecoverableError(error.message);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  // Read the real configured attempts/backoff straight from the production
  // queue factory, rather than assuming what queues/publishing.ts says.
  const configQueue = createPublishQueue();
  const configured = configQueue.opts.defaultJobOptions;
  await configQueue.close();

  const attempts = configured?.attempts;
  const backoff = configured?.backoff;
  console.log(`Configured: attempts=${attempts} backoff=${JSON.stringify(backoff)}\n`);

  if (!attempts || !backoff || typeof backoff !== "object" || !("delay" in backoff)) {
    console.error("Could not read attempts/backoff off the real queue config. Aborting.");
    process.exit(1);
  }

  const queue = new Queue<TestJobData>("retry-verification", {
    connection: connection(),
    defaultJobOptions: { attempts, backoff, removeOnComplete: true, removeOnFail: false },
  });

  const attemptTimestamps = new Map<string, number[]>();

  const worker = new Worker<TestJobData>(
    "retry-verification",
    async (job: Job<TestJobData>) => {
      const stamps = attemptTimestamps.get(job.id!) ?? [];
      stamps.push(Date.now());
      attemptTimestamps.set(job.id!, stamps);
      await runPublishAttempt(job.data.mockStatus);
    },
    { connection: connection(), concurrency: 5 },
  );

  let failures = 0;
  function check(name: string, passed: boolean, detail = ""): void {
    console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
    if (!passed) failures += 1;
  }

  // Test A: 500 (retryable). Wait for BullMQ to exhaust every configured
  // attempt, spaced by the real exponential backoff, and confirm it does.
  const retryableDone = new Promise<{ attemptsMade: number; jobId: string }>((resolve) => {
    worker.on("failed", (job) => {
      if (job?.data.mockStatus === 500 && job.attemptsMade >= (job.opts.attempts ?? 0)) {
        resolve({ attemptsMade: job.attemptsMade, jobId: job.id! });
      }
    });
  });

  const retryableJob = await queue.add("retryable", { mockStatus: 500 });
  console.log(`Job ${retryableJob.id} enqueued with a 500 response; waiting out full backoff...`);

  const retryableResult = await retryableDone;
  const stamps = attemptTimestamps.get(retryableResult.jobId) ?? [];
  const gaps = stamps.slice(1).map((t, i) => Math.round((t - stamps[i]) / 1000));

  check("500 retries the configured number of times", retryableResult.attemptsMade === attempts, `attemptsMade=${retryableResult.attemptsMade}`);
  check("attempted exactly `attempts` times", stamps.length === attempts, `saw ${stamps.length} attempts`);
  // Exponential from a 5s base: ~5s, ~10s, ~20s, ~40s. Allow slack for scheduler jitter.
  const expected = Array.from({ length: (attempts as number) - 1 }, (_, i) => (backoff.delay / 1000) * 2 ** i);
  const withinTolerance = gaps.every((gap, i) => Math.abs(gap - expected[i]) <= Math.max(2, expected[i] * 0.3));
  check("backoff between attempts matches exponential(5s)", withinTolerance, `gaps=${gaps}s expected~${expected}s`);

  // Test B: 401 (permanent). Confirm it ends on the first attempt via
  // UnrecoverableError, not the configured 5.
  const permanentDone = new Promise<{ attemptsMade: number; wasUnrecoverable: boolean }>((resolve) => {
    worker.on("failed", (job, error) => {
      if (job?.data.mockStatus === 401) {
        resolve({ attemptsMade: job.attemptsMade, wasUnrecoverable: error instanceof UnrecoverableError });
      }
    });
  });

  const permanentJob = await queue.add("permanent", { mockStatus: 401 });
  console.log(`\nJob ${permanentJob.id} enqueued with a 401 response; expecting no retries...`);
  const permanentResult = await permanentDone;

  // Give BullMQ a window it would need to schedule a retry in, then confirm
  // none landed -- the job must still show exactly one attempt.
  await new Promise((r) => setTimeout(r, 3000));
  const permanentStamps = attemptTimestamps.get(permanentJob.id!) ?? [];

  check("401 raised as UnrecoverableError", permanentResult.wasUnrecoverable);
  check("401 did not retry (1 attempt, not the configured 5)", permanentResult.attemptsMade === 1, `attemptsMade=${permanentResult.attemptsMade}`);
  check("no further attempt landed after the failure", permanentStamps.length === 1, `saw ${permanentStamps.length} attempts`);

  await worker.close();
  await queue.close();

  console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures > 0 ? 1 : 0);
}

void main();
