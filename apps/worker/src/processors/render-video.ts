import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { UnrecoverableError, Worker, type Job } from "bullmq";

import { logger } from "../lib/logger";
import { createRedis } from "../lib/redis";
import { stitchClips, writeClip } from "../lib/stitch";
import { createServiceClient } from "../lib/supabase";
import { RENDER_QUEUE, type RenderJobData } from "../queues/rendering";

/**
 * Joins a project's clips into one video.
 *
 * Only one render runs at a time. Encoding is CPU-bound, unlike publishing
 * which waits on other people's APIs, so raising this does not raise
 * throughput: it just makes several renders share the same cores and all
 * finish later. The queue is the right place for the backlog to sit.
 */
const CONCURRENCY = 1;

const BUCKET = "renders";

/** Where the finished cut lives, under the owner's own prefix. */
function outputPath(userId: string, renderId: string): string {
  return `${userId}/exports/${renderId}.mp4`;
}

async function settle(
  supabase: ReturnType<typeof createServiceClient>,
  renderId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("project_renders").update(patch).eq("id", renderId);
  if (error) logger.error("could not settle render row", { renderId, error: error.message });
}

async function process(job: Job<RenderJobData>): Promise<void> {
  const { renderId, userId, clipPaths } = job.data;
  const supabase = createServiceClient();

  /*
   * Every path is checked against the owner's own prefix before anything is
   * read. The job data comes from a row a client inserted, and the worker holds
   * the service role, so without this a crafted `clip_paths` would have it
   * fetch and republish somebody else's render under the caller's account.
   */
  const foreign = clipPaths.filter((path) => !path.startsWith(`${userId}/`));
  if (foreign.length > 0) {
    await settle(supabase, renderId, { status: "failed", error: "Those clips are not yours" });
    // Unrecoverable: retrying cannot make the paths belong to this user, and a
    // retry would just re-run the same refusal four more times.
    throw new UnrecoverableError(`render ${renderId} referenced ${foreign.length} foreign clips`);
  }

  const workspace = await mkdtemp(join(tmpdir(), "bs-render-"));
  try {
    const files: string[] = [];
    for (const [index, path] of clipPaths.entries()) {
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (error || !data) throw new Error(`could not read ${path}: ${error?.message ?? "missing"}`);
      files.push(await writeClip(workspace, index, Buffer.from(await data.arrayBuffer())));
    }

    const { bytes, durationSeconds } = await stitchClips(files);

    const path = outputPath(userId, renderId);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "video/mp4", upsert: true });
    if (uploadError) throw new Error(`could not store the cut: ${uploadError.message}`);

    await settle(supabase, renderId, {
      status: "ready",
      result_path: path,
      duration_seconds: Math.round(durationSeconds),
      error: null,
    });

    logger.info("render finished", {
      renderId,
      clips: clipPaths.length,
      seconds: Math.round(durationSeconds),
      bytes: bytes.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Recorded on the row before rethrowing, so a user watching sees why it
    // failed rather than a job that silently stops moving. BullMQ still retries
    // once, and a later success overwrites this.
    await settle(supabase, renderId, { status: "failed", error: message });
    throw error;
  } finally {
    // Whole videos live here. Leaving them behind fills the disk of a
    // long-running worker rather than merely littering.
    await rm(workspace, { recursive: true, force: true });
  }
}

export function startRenderWorker(): Worker<RenderJobData> {
  const worker = new Worker<RenderJobData>(RENDER_QUEUE, process, {
    connection: createRedis(),
    concurrency: CONCURRENCY,
  });

  worker.on("failed", (job, error) => {
    logger.error("render job failed", { renderId: job?.data.renderId, error: error.message });
  });

  return worker;
}
