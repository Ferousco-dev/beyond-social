import {
  ALL_FORMATS,
  AudioBufferSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  canEncodeVideo,
  Input,
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

/**
 * Mixes every sound in the project into one stereo track. A video whose sound
 * cannot be read is skipped rather than failing the whole export.
 */
async function mixAudio(project: Project, urls: ExportOptions["urls"], seconds: number): Promise<AudioBuffer | null> {
  const sounds = [...mediaOf(project, "audio"), ...mediaOf(project, "video")];
  const context = new OfflineAudioContext(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  let used = 0;
  for (const item of sounds) {
    const url = resolveSrc(item.src, urls);
    if (!url || item.volume === 0) continue;
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = item.volume;
      source.connect(gain).connect(context.destination);
      source.playbackRate.value = speedOf(item);
      // The last argument is in source seconds, so a faster clip reads more of the file.
      source.start(item.start, item.trimIn, item.duration * speedOf(item));
      used += 1;
    } catch {
      continue;
    }
  }
  return used > 0 ? context.startRendering() : null;
}

/** Renders the project to an MP4 in the browser: each frame is drawn on a canvas and encoded as it goes. */
export async function exportProject(project: Project, { urls, onProgress, signal }: ExportOptions): Promise<Blob> {
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
    const mixed = await mixAudio(project, urls, seconds);
    const audio = mixed ? new AudioBufferSource({ codec: "aac", bitrate: AUDIO_BITRATE }) : null;
    if (audio) output.addAudioTrack(audio);
    await output.start();
    if (audio && mixed) {
      await audio.add(mixed);
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
    return new Blob([target.buffer], { type: "video/mp4" });
  } finally {
    for (const { input } of sinks.values()) input.dispose();
  }
}
