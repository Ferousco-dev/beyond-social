import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { type SupabaseClient } from "@supabase/supabase-js";

import { joinClips } from "./ffmpeg.js";
import { specOrWholeClips, type RenderSpec } from "./spec.js";

/**
 * One export, start to finish.
 *
 * Claim, download, join, upload, mark. The row is moved to `generating` by the
 * claim itself, so a crash mid-render leaves it there rather than back in the
 * queue: a job that silently retries forever is how one broken clip becomes an
 * unbounded bill. Those rows are visible and can be requeued deliberately.
 */

const BUCKET = "renders";

/** Signed long enough to download a few hundred megabytes on a slow link. */
const SIGNED_URL_TTL = 30 * 60;

export interface ClaimedJob {
  readonly id: string;
  readonly user_id: string;
  readonly clip_paths: string[];
  readonly spec: unknown;
}

async function download(client: SupabaseClient, path: string, target: string): Promise<void> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) {
    throw new Error(`Could not sign ${path}: ${error?.message ?? "no url"}`);
  }

  const response = await fetch(data.signedUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ${path}: HTTP ${response.status}`);
  }

  // Streamed rather than buffered: a handful of clips held in memory at once is
  // the difference between a small worker and an out-of-memory kill.
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(target));
}

async function renderOne(client: SupabaseClient, job: ClaimedJob, spec: RenderSpec): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "bs-source-"));

  try {
    const sources: string[] = [];
    for (const [index, clip] of spec.clips.entries()) {
      const target = join(dir, `source-${index}.mp4`);
      await download(client, clip.path, target);
      sources.push(target);
    }

    const { output, cleanup } = await joinClips(spec.clips, sources);
    try {
      const { size } = await stat(output);
      const { createReadStream } = await import("node:fs");

      // Filed under the owner's prefix, matching every other object in this
      // bucket, so the same storage policies apply to an export as to a render.
      const path = `${job.user_id}/exports/${job.id}.mp4`;
      const { error } = await client.storage.from(BUCKET).upload(path, createReadStream(output), {
        contentType: "video/mp4",
        duplex: "half",
        upsert: true,
      } as never);
      if (error) throw new Error(`Upload failed: ${error.message}`);

      await client
        .from("project_renders")
        .update({
          status: "ready",
          result_path: path,
          duration_seconds: Math.round(
            spec.clips.reduce((total, clip) => total + (clip.endSeconds - clip.startSeconds), 0),
          ),
          error: null,
        })
        .eq("id", job.id);

      console.info(`[render] ${job.id} done (${Math.round(size / 1024)}kb)`);
    } finally {
      await cleanup();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Runs one job, recording the failure on the row rather than throwing it away. */
export async function processJob(client: SupabaseClient, job: ClaimedJob): Promise<void> {
  try {
    const spec = specOrWholeClips(job.spec, job.clip_paths);
    if (!spec) throw new Error("This export has no clips to join");

    await renderOne(client, job, spec);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[render] ${job.id} failed: ${message}`);

    // The user is watching this row. A failure with no reason on it shows as a
    // spinner that never stops.
    await client
      .from("project_renders")
      .update({ status: "failed", error: message.slice(0, 500) })
      .eq("id", job.id);
  }
}
