import { type Caption, type Clip } from "./data";

/** Formats a millisecond offset as the `m:ss` timecode the editor displays. */
export function formatTimecode(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Evenly spaced ruler ticks covering the project, always including the final
 * frame so the track and the ruler end on the same edge.
 */
export function buildRuler(durationMs: number, stepMs = 6_000): readonly number[] {
  if (durationMs <= 0 || stepMs <= 0) return [0];
  const ticks: number[] = [];
  for (let tick = 0; tick < durationMs; tick += stepMs) ticks.push(tick);
  ticks.push(durationMs);
  return ticks;
}

/** Position of a moment on the track, as a percentage of total duration. */
export function toPercent(ms: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return clamp((ms / durationMs) * 100, 0, 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clipAt(clips: readonly Clip[], ms: number): Clip | undefined {
  return clips.find((clip) => ms >= clip.startMs && ms < clip.startMs + clip.durationMs);
}

export function captionAt(captions: readonly Caption[], ms: number): Caption | undefined {
  return captions.find((caption) => ms >= caption.startMs && ms < caption.endMs);
}
