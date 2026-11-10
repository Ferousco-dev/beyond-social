import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  canEncodeVideo,
  Input,
  type InputAudioTrack,
  Mp4OutputFormat,
  Output,
  UrlSource,
} from "mediabunny";

import { endOf, projectDuration, speedOf } from "../core/find.ts";
import { type Item, type Project } from "../core/types.ts";
import { drawFrame, type VideoFrame } from "./compose";
import { resolveSrc } from "./media-ref";

const VIDEO_BITRATE = 8_000_000;
const AUDIO_BITRATE = 128_000;
const SAMPLE_RATE = 48_000;

type Media = Extract<Item, { kind: "video" | "audio" }>;
type Sink = { readonly sink: CanvasSink; readonly input: Input };

export class ExportCancelled extends Error {}

export interface ExportOptions {
  readonly urls: Readonly<Record<string, string>>;
  readonly onProgress: (fraction: number) => void;
  readonly signal: AbortSignal;
}

export interface ExportResult {
  readonly blob: Blob;
  /** Things the person should know about, such as a clip whose sound could not be included. */
  readonly warnings: readonly string[];
}

const mediaOf = (project: Project, kind: Media["kind"]): Media[] =>
  project.tracks.flatMap((t) => t.items.filter((i): i is Media => i.kind === kind));

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A picture could not be loaded."));
    image.src = url;
  });
}

/** How much of the timeline is mixed at once, so memory stays flat however long the video is. */
const WINDOW_SECONDS = 10;
/** A file the streaming reader cannot handle is decoded whole only if it is smaller than this. */
const WHOLE_FILE_LIMIT_BYTES = 150 * 1024 * 1024;

/** One sound in the project, ready to be read a piece at a time. */
interface Voice {
  readonly item: Media;
  readonly name: string;
  /** Reads just the part of the file that is asked for. Null when the whole file had to be decoded. */
  readonly sink: AudioBufferSink | null;
  readonly decoded: AudioBuffer | null;
}

const nameOf = (project: Project, item: Media): string =>
  project.assets?.find((asset) => asset.src === item.src)?.name ?? (item.kind === "audio" ? "A sound" : "A video");

/** Decodes a whole file, for the rare codec the streaming reader cannot handle. Refuses very large files. */
async function decodeWhole(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The file could not be fetched.");
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > WHOLE_FILE_LIMIT_BYTES) throw new Error("The file is too large to decode.");
  return new OfflineAudioContext(2, 1, SAMPLE_RATE).decodeAudioData(await response.arrayBuffer());
}

/**
 * Opens every sound in the project. Videos that simply have no sound are
 * skipped quietly; a sound that is there but cannot be read is reported
 * through `warn`, so an export never goes silent without saying so.
 */
async function prepareVoices(
  project: Project,
  urls: ExportOptions["urls"],
  videoInputs: ReadonlyMap<string, Input>,
  opened: Input[],
  warn: (message: string) => void,
): Promise<Voice[]> {
  const voices: Voice[] = [];
  for (const item of [...mediaOf(project, "audio"), ...mediaOf(project, "video")]) {
    const url = resolveSrc(item.src, urls);
    if (!url || item.volume === 0) continue;
    const name = nameOf(project, item);
    try {
      let input = videoInputs.get(item.id);
      if (!input) {
        input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
        opened.push(input);
      }
      const track: InputAudioTrack | null = await input.getPrimaryAudioTrack();
      if (!track) {
        if (item.kind === "audio") warn(`${name} has no sound to include.`);
        continue;
      }
      if (await track.canDecode()) {
        voices.push({ item, name, sink: new AudioBufferSink(track), decoded: null });
        continue;
      }
      voices.push({ item, name, sink: null, decoded: await decodeWhole(url) });
    } catch {
      warn(`${name}: its sound could not be read, so it is missing from the export.`);
    }
  }
  return voices;
}

/** Mixes one stretch of the timeline into stereo, reading only the pieces of each file that fall inside it. */
async function mixWindow(voices: readonly Voice[], from: number, to: number, warn: (message: string) => void): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, Math.max(1, Math.round((to - from) * SAMPLE_RATE)), SAMPLE_RATE);
  for (const { item, name, sink, decoded } of voices) {
    const speed = speedOf(item);
    const lo = Math.max(from, item.start);
    const hi = Math.min(to, endOf(item));
    if (hi <= lo) continue;
    // The same stretch, measured in the file's own seconds.
    const sourceFrom = item.trimIn + (lo - item.start) * speed;
    const sourceTo = item.trimIn + (hi - item.start) * speed;
    const gain = context.createGain();
    // The preview player tops out at full volume, so the file does too.
    gain.gain.value = Math.min(1, item.volume);
    gain.connect(context.destination);
    const place = (buffer: AudioBuffer, bufferStart: number): void => {
      const begin = Math.max(bufferStart, sourceFrom);
      const length = Math.min(bufferStart + buffer.duration, sourceTo) - begin;
      if (length <= 0) return;
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.playbackRate.value = speed;
      node.connect(gain);
      // The last argument is in the file's seconds, so a faster clip reads more of it.
      node.start(Math.max(0, item.start + (begin - item.trimIn) / speed - from), begin - bufferStart, length);
    };
    try {
      if (sink) for await (const piece of sink.buffers(sourceFrom, sourceTo)) place(piece.buffer, piece.timestamp);
      else if (decoded) place(decoded, 0);
    } catch {
      warn(`${name}: part of its sound could not be read, so it is missing from the export.`);
    }
  }
  return context.startRendering();
}

/** Renders the project to an MP4 in the browser: each frame is drawn on a canvas and encoded as it goes. */
export async function exportProject(project: Project, { urls, onProgress, signal }: ExportOptions): Promise<ExportResult> {
  const seconds = projectDuration(project);
  if (seconds <= 0) throw new Error("There is nothing on the timeline to export.");
  if (!(await canEncodeVideo("avc", { width: project.width, height: project.height }))) {
    throw new Error("This browser cannot encode video. Use a recent version of Chrome or Edge.");
  }
  const cancelled = (): void => {
    if (signal.aborted) throw new ExportCancelled();
  };

  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the video.");

  const sinks = new Map<string, Sink>();
  const images = new Map<string, HTMLImageElement>();
  const opened: Input[] = [];
  const warnings: string[] = [];
  const warn = (message: string): void => {
    if (!warnings.includes(message)) warnings.push(message);
  };
  try {
    for (const item of mediaOf(project, "video")) {
      const url = resolveSrc(item.src, urls);
      if (!url) throw new Error("A video is still loading. Try again in a moment.");
      const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error("A clip has no picture to export.");
      sinks.set(item.id, { input, sink: new CanvasSink(track, { width: project.width, height: project.height, fit: "contain" }) });
    }
    for (const track of project.tracks) {
      for (const item of track.items) {
        if (item.kind !== "image" || images.has(item.src)) continue;
        const url = resolveSrc(item.src, urls);
        if (url) images.set(item.src, await loadImage(url));
      }
    }
    cancelled();

    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat(), target });
    const video = new CanvasSource(canvas, { codec: "avc", bitrate: VIDEO_BITRATE });
    output.addVideoTrack(video, { frameRate: project.fps });
    const voices = await prepareVoices(project, urls, new Map([...sinks].map(([id, { input }]) => [id, input])), opened, warn);
    const audio = voices.length > 0 ? new AudioBufferSource({ codec: "aac", bitrate: AUDIO_BITRATE }) : null;
    if (audio) output.addAudioTrack(audio);
    await output.start();
    if (audio) {
      // Mixed and encoded a window at a time, so a long video never sits in memory whole.
      for (let from = 0; from < seconds; from += WINDOW_SECONDS) {
        cancelled();
        await audio.add(await mixWindow(voices, from, Math.min(seconds, from + WINDOW_SECONDS), warn));
      }
      audio.close();
    }

    const frames = Math.ceil(seconds * project.fps);
    const clips = mediaOf(project, "video");
    for (let i = 0; i < frames; i += 1) {
      cancelled();
      const time = i / project.fps;
      const ready = new Map<string, VideoFrame>();
      for (const clip of clips) {
        if (time < clip.start || time >= endOf(clip)) continue;
        const wrapped = await sinks.get(clip.id)?.sink.getCanvas(clip.trimIn + (time - clip.start) * speedOf(clip));
        if (wrapped) ready.set(clip.id, { source: wrapped.canvas, width: project.width, height: project.height });
      }
      drawFrame(ctx, project, time, { video: (id) => ready.get(id), image: (src) => images.get(src) });
      await video.add(time, 1 / project.fps);
      onProgress((i + 1) / frames);
    }
    video.close();
    await output.finalize();
    if (!target.buffer) throw new Error("The export produced no file.");
    return { blob: new Blob([target.buffer], { type: "video/mp4" }), warnings };
  } finally {
    for (const { input } of sinks.values()) input.dispose();
    for (const input of opened) input.dispose();
  }
}
