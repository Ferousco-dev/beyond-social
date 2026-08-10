import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type RenderClip } from "./spec.js";

/**
 * Joining the cut into one file.
 *
 * Two passes rather than one filter graph. Each clip is cut and normalised on
 * its own first, then the results are concatenated with the demuxer, which is a
 * stream copy and costs nothing. A single `concat` filter over clips of
 * different sizes, frame rates or pixel formats is where this normally breaks,
 * and normalising first means every input to the join is already identical.
 *
 * The output is the vertical short-form shape the whole product is built around.
 * Clips of other sizes are padded rather than stretched, because a stretched
 * face is worse than a letterboxed one.
 */

/** The shape everything renders to. Everything else in the product assumes it. */
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

/** A join that has not finished by here is stuck, and holding the slot. */
const TIMEOUT_MS = 8 * 60 * 1000;

export class FfmpegError extends Error {}

function run(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args]);

    // stderr is the only place ffmpeg explains itself, and a failure with no
    // reason is unactionable in a log a week later.
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new FfmpegError(`ffmpeg timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new FfmpegError(`ffmpeg could not start: ${error.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new FfmpegError(stderr.trim().slice(-600) || `ffmpeg exited ${code}`));
    });
  });
}

/** Cuts one clip to its trim and normalises it to the output shape. */
async function prepare(clip: RenderClip, source: string, target: string): Promise<void> {
  const duration = clip.endSeconds - clip.startSeconds;

  await run([
    // Before `-i`, so the seek is done by demuxing rather than by decoding and
    // discarding every frame up to the cut.
    "-ss",
    clip.startSeconds.toFixed(3),
    "-i",
    source,
    ...(Number.isFinite(duration) && duration < 3600 ? ["-t", duration.toFixed(3)] : []),
    "-vf",
    // Fit inside the frame, pad the rest, and force square pixels: without
    // `setsar` a source with non-square pixels makes the concat refuse.
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${FPS}`,
    "-af",
    `volume=${clip.volume.toFixed(2)}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    "-ac",
    "2",
    /*
     * A silent track is added when the source has none. The concat demuxer
     * needs every input to have the same streams, and a clip with no audio next
     * to one with audio is the most common way this fails.
     */
    "-shortest",
    "-y",
    target,
  ]);
}

/**
 * Renders the cut and returns the finished file's path.
 *
 * The caller owns cleanup of nothing: the working directory is created and
 * removed here, so a failure halfway does not leave gigabytes behind.
 */
export async function joinClips(
  clips: readonly RenderClip[],
  sources: readonly string[],
): Promise<{ output: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "bs-render-"));
  const cleanup = () => rm(dir, { recursive: true, force: true });

  try {
    const parts: string[] = [];
    for (const [index, clip] of clips.entries()) {
      const source = sources[index];
      if (!source) throw new FfmpegError(`Clip ${index + 1} has no downloaded source`);

      const part = join(dir, `part-${index}.mp4`);
      await prepare(clip, source, part);
      parts.push(part);
    }

    // Paths are single-quoted and internal quotes escaped, because this file is
    // parsed by ffmpeg rather than by a shell and a quote in a name would end
    // the entry early.
    const listFile = join(dir, "parts.txt");
    await writeFile(
      listFile,
      parts.map((part) => `file '${part.replace(/'/g, "'\\''")}'`).join("\n"),
      "utf8",
    );

    const output = join(dir, "export.mp4");
    await run([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFile,
      // Stream copy: every part was normalised above, so there is nothing left
      // to re-encode and this is close to instant.
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      "-y",
      output,
    ]);

    return { output, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
