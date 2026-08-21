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

/** Settings a browser and every publishing platform will accept, shared by every render. */
const ENCODE_ARGS: readonly string[] = [
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
  // Interleaves the header at the front so the result starts playing before it
  // has fully downloaded, which matters for a preview in the thread.
  "-movflags",
  "+faststart",
];

/**
 * Runs one filter graph to completion and returns the finished mp4.
 *
 * Shared by the whole-clip join and the trimmed one below: both build a
 * `[v][a]` pair from a `-filter_complex` and differ only in how that pair is
 * produced, not in how it is encoded or read back.
 */
async function renderGraph(files: readonly string[], filterComplex: string): Promise<StitchResult> {
  const workspace = await mkdtemp(join(tmpdir(), "bs-stitch-"));
  try {
    const output = join(workspace, "output.mp4");

    const args: string[] = ["-hide_banner", "-loglevel", "error", "-y"];
    for (const file of files) args.push("-i", file);
    args.push(
      "-filter_complex",
      filterComplex,
      "-map",
      "[v]",
      "-map",
      "[a]",
      ...ENCODE_ARGS,
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

/**
 * Concatenates clips whole, in order, and returns the finished mp4.
 *
 * Deliberately re-encodes rather than stream-copying. Copying is far faster and
 * works only when every input shares a codec, resolution, frame rate and time
 * base; clips from different models, or the same model at different settings,
 * silently produce a file that plays the first clip and then stalls. Paying the
 * encode is what makes the output play everywhere.
 *
 * The fallback for a render with no cut of its own: a spec-less job, or a spec
 * old enough to predate this column, joins its clips exactly as it always did.
 */
export async function stitchClips(files: readonly string[]): Promise<StitchResult> {
  if (files.length === 0) throw new Error("nothing to stitch");
  if (files.length > MAX_CLIPS) throw new Error(`too many clips: ${files.length} > ${MAX_CLIPS}`);

  /*
   * The filter graph, rather than the concat demuxer.
   *
   * The demuxer needs a list file and still refuses inputs whose parameters
   * differ. `concat` as a filter decodes each input first, so mismatched
   * sources are resolved by the scaler instead of failing.
   */
  const parts = files.map((_, index) => `[${index}:v:0][${index}:a:0]`).join("");
  return renderGraph(files, `${parts}concat=n=${files.length}:v=1:a=1[v][a]`);
}

export interface TrimmedClip {
  readonly file: string;
  /** Where the cut starts inside this file, in seconds. */
  readonly startSeconds: number;
  /** Where it ends. Always greater than `startSeconds`. */
  readonly endSeconds: number;
  /** 0 to 1. Zero is silence, which is a normal thing to want. */
  readonly volume: number;
}

/**
 * Concatenates the trims and levels the user actually authored, and returns
 * the finished mp4.
 *
 * `stitchClips` joins whatever was rendered; this joins what the editor's
 * timeline says should play, which is not the same file once anything has
 * been trimmed or a track muted. Each input is cut to its own span and set to
 * its own level before the same concat this whole module already used, so a
 * mismatched source is resolved the same way an untrimmed one is.
 */
export async function stitchTrimmedClips(clips: readonly TrimmedClip[]): Promise<StitchResult> {
  if (clips.length === 0) throw new Error("nothing to stitch");
  if (clips.length > MAX_CLIPS) throw new Error(`too many clips: ${clips.length} > ${MAX_CLIPS}`);

  const files = clips.map((clip) => clip.file);
  const graph = clips
    .map((clip, index) => {
      const trim = `trim=start=${clip.startSeconds}:end=${clip.endSeconds},setpts=PTS-STARTPTS`;
      const atrim = `atrim=start=${clip.startSeconds}:end=${clip.endSeconds},asetpts=PTS-STARTPTS,volume=${clip.volume}`;
      return `[${index}:v:0]${trim}[v${index}];[${index}:a:0]${atrim}[a${index}];`;
    })
    .join("");
  const parts = clips.map((_, index) => `[v${index}][a${index}]`).join("");

  return renderGraph(files, `${graph}${parts}concat=n=${clips.length}:v=1:a=1[v][a]`);
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
