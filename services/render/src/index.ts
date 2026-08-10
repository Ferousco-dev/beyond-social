import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { processJob, type ClaimedJob } from "./lib/jobs.js";

/**
 * The render worker.
 *
 * Polls for queued exports, joins their clips with ffmpeg, and uploads the
 * result. Separate from the web app because joining video is minutes of CPU and
 * hundreds of megabytes of disk, neither of which belongs in a request.
 *
 * Polling rather than a queue, unlike the mail service. The claim is already a
 * single atomic statement with `for update skip locked`, so the database is the
 * queue; adding Redis would be a second thing to run for a job that arrives a
 * few times an hour.
 *
 * REQUIRES ffmpeg ON PATH. This is why it does not run on Vercel: the render
 * host needs a real filesystem and a real binary.
 */

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** How long to wait when the queue came back empty. */
  RENDER_POLL_MS: z.coerce.number().int().min(1000).default(15_000),
  /** How many exports one worker will run at once. One is a whole CPU. */
  RENDER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
});

const env = envSchema.parse(process.env);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let running = true;

/** Finishes the job in hand before exiting, so a deploy does not strand one. */
function shutdown(signal: string): void {
  console.info(`[render] ${signal} received, finishing current work`);
  running = false;
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function tick(): Promise<number> {
  const { data, error } = await supabase.rpc("claim_queued_renders", {
    p_limit: env.RENDER_CONCURRENCY,
  });

  if (error) {
    console.error(`[render] could not claim: ${error.message}`);
    return 0;
  }

  const jobs = (data ?? []) as ClaimedJob[];
  if (jobs.length === 0) return 0;

  console.info(`[render] claimed ${jobs.length}`);
  // Sequential. Each job is already saturating a core, and running two would
  // make both slower rather than finishing either sooner.
  for (const job of jobs) {
    await processJob(supabase, job);
  }

  return jobs.length;
}

async function main(): Promise<void> {
  console.info(`[render] worker up, polling every ${env.RENDER_POLL_MS}ms`);

  while (running) {
    const done = await tick().catch((error: unknown) => {
      // The loop must survive anything a single pass throws, or one bad row
      // takes the worker down and every queued export stops.
      console.error(`[render] tick failed: ${error instanceof Error ? error.message : error}`);
      return 0;
    });

    // Straight back round when there was work: a backlog should drain at the
    // speed of the encoder, not of the poll interval.
    if (done === 0) await new Promise((resolve) => setTimeout(resolve, env.RENDER_POLL_MS));
  }

  console.info("[render] worker stopped");
}

void main();
