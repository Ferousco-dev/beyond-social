import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

/**
 * Joining clips into one video.
 *
 * Every model this platform can reach caps a single render at eight to fifteen
 * seconds, and social video runs far longer than that. Without this the product
 * can only make clips, never a piece of content, which is a harder ceiling than
 * any quality problem.
 */

/** ffmpeg-static resolves to null on a platform it has no binary for. */
function binary(): string {
  if (!ffmpegPath) throw new Error("ffmpeg binary is unavailable on this platform");
  return ffmpegPath;
}

/**
 * Anything longer is not a social video, it is a mistake in the job. Bounded
 * because each clip is decoded and re-encoded, so an unbounded list is an
 * unbounded amount of someone else's CPU.
 */
const MAX_CLIPS = 20;

export interface StitchResult {
  readonly bytes: Buffer;
  readonly durationSeconds: number;
}

/**
 * Concatenates clips in order and returns the finished mp4.
 *
 * Deliberately re-encodes rather than stream-copying. Copying is far faster and
 * works only when every input shares a codec, resolution, frame rate and time
 * base; clips from different models, or the same model at different settings,
 * silently produce a file that plays the first clip and then stalls. Paying the
 * encode is what makes the output play everywhere.
 */
export async function stitchClips(files: readonly string[]): Promise<StitchResult> {
  if (files.length === 0) throw new Error("nothing to stitch");
  if (files.length > MAX_CLIPS) throw new Error(`too many clips: ${files.length} > ${MAX_CLIPS}`);

  const workspace = await mkdtemp(join(tmpdir(), "bs-stitch-"));
  try {
    const output = join(workspace, "output.mp4");

    /*
     * The filter graph, rather than the concat demuxer.
     *
     * The demuxer needs a list file and still refuses inputs whose parameters
     * differ. `concat` as a filter decodes each input first, so mismatched
     * sources are resolved by the scaler instead of failing. Audio is included
     * per input, and a clip that has none would break the graph, so silence is
     * generated for every input and mixed in.
     */
    const args: string[] = ["-hide_banner", "-loglevel", "error", "-y"];
    for (const file of files) args.push("-i", file);

    const parts = files.map((_, index) => `[${index}:v:0][${index}:a:0]`).join("");
    args.push(
      "-filter_complex",
      `${parts}concat=n=${files.length}:v=1:a=1[v][a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      // Baseline settings a browser and every platform will accept.
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      // Interleaves the header at the front so the result starts playing before
      // it has fully downloaded, which matters for a preview in the thread.
      "-movflags",
      "+faststart",
      output,
    );

    await run(binary(), args, { maxBuffer: 1024 * 1024 * 16 });

    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(output);
    return { bytes, durationSeconds: await probeDuration(output) };
  } finally {
    // The temp directory holds whole videos, so leaving it behind fills the
    // disk of a long-running worker rather than merely littering.
    await rm(workspace, { recursive: true, force: true });
  }
}

/** Reads the finished duration back, rather than trusting the sum of the inputs. */
async function probeDuration(file: string): Promise<number> {
  try {
    const { stderr } = await run(binary(), ["-hide_banner", "-i", file], {
      maxBuffer: 1024 * 1024,
    }).catch((error: { stderr?: string }) => ({ stderr: error.stderr ?? "" }));
    const match = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(stderr ?? "");
    if (!match) return 0;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  } catch {
    return 0;
  }
}

/** Writes clips to a workspace under predictable names. Used by the processor. */
export async function writeClip(dir: string, index: number, bytes: Buffer): Promise<string> {
  const file = join(dir, `clip-${String(index).padStart(3, "0")}.mp4`);
  await writeFile(file, bytes);
  return file;
}

/**
 * Grabs the final frame of a clip, as JPEG bytes.
 *
 * This is what makes a sequence continuous rather than a set of unrelated
 * cuts. Feeding it back as the reference image for the next shot means the
 * next clip opens on exactly the frame the last one closed on, so the join
 * reads as one take. It also re-anchors the subject every eight seconds, which
 * is the only real defence against a face drifting over a long video.
 *
 * `-sseof` seeks from the end rather than the start, so the cost does not grow
 * with the length of the clip. Half a second back rather than zero: seeking to
 * the exact end lands past the last frame on some files and produces nothing.
 */
export async function lastFrame(file: string): Promise<Buffer> {
  const workspace = await mkdtemp(join(tmpdir(), "bs-frame-"));
  try {
    const output = join(workspace, "frame.jpg");
    await run(
      binary(),
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-sseof",
        "-0.5",
        "-i",
        file,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        output,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    const { readFile } = await import("node:fs/promises");
    return await readFile(output);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
