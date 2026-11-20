export interface FrameDiff {
  readonly time: number;
  /** Normalized difference from the previous sampled frame, in [0, 1]. */
  readonly diff: number;
}

export interface CutOptions {
  /** Total start/end bounds of the scanned range, in source seconds. */
  readonly start: number;
  readonly end: number;
  /** Minimum length of each resulting scene, in seconds. */
  readonly minSceneSeconds?: number;
  /** Absolute floor below which a frame change is never treated as a cut. */
  readonly minDiff?: number;
  /** How much higher than local motion a spike must be to count as a cut. */
  readonly spikeRatio?: number;
  /** Minimum absolute jump above local median motion. */
  readonly minExcess?: number;
  readonly maxCuts?: number;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Picks hard scene-cut timestamps from frame-to-frame difference scores.
 * Uses a local median baseline so smooth pans and camera motion do not trigger
 * false cuts while sharp shot changes stand out cleanly.
 */
export function pickSceneCuts(samples: readonly FrameDiff[], opts: CutOptions): number[] {
  const minScene = opts.minSceneSeconds ?? 1.0;
  const minDiff = opts.minDiff ?? 0.22;
  const spikeRatio = opts.spikeRatio ?? 2.4;
  const minExcess = opts.minExcess ?? 0.12;
  const maxCuts = opts.maxCuts ?? 20;

  if (samples.length === 0 || opts.end - opts.start < minScene * 2) return [];

  const candidates: FrameDiff[] = [];
  const window = 4;

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i]!;
    if (sample.time - opts.start < minScene || opts.end - sample.time < minScene) continue;
    if (sample.diff < minDiff) continue;

    const neighbors: number[] = [];
    for (let j = Math.max(0, i - window); j <= Math.min(samples.length - 1, i + window); j += 1) {
      if (j !== i) neighbors.push(samples[j]!.diff);
    }
    const base = median(neighbors);
    if (sample.diff >= base * spikeRatio && sample.diff - base >= minExcess) {
      candidates.push(sample);
    }
  }

  // Greedy non-maximum suppression: keep the strongest cuts at least `minScene` apart.
  candidates.sort((a, b) => b.diff - a.diff);
  const chosen: FrameDiff[] = [];
  for (const c of candidates) {
    if (chosen.length >= maxCuts) break;
    if (chosen.every((kept) => Math.abs(kept.time - c.time) >= minScene)) {
      chosen.push(c);
    }
  }

  return chosen.map((c) => c.time).sort((a, b) => a - b);
}

const SAMPLE_W = 32;
const SAMPLE_H = 18;
const HIST_BINS = 16;

interface FrameSig {
  readonly rgb: Uint8Array;
  readonly hist: Float32Array;
}

function captureSignature(ctx: CanvasRenderingContext2D, video: HTMLVideoElement): FrameSig {
  ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
  const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
  const pixels = SAMPLE_W * SAMPLE_H;
  const rgb = new Uint8Array(pixels * 3);
  const hist = new Float32Array(HIST_BINS);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 3) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    rgb[p] = r;
    rgb[p + 1] = g;
    rgb[p + 2] = b;
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 256;
    const bin = Math.min(HIST_BINS - 1, Math.floor(luma * HIST_BINS));
    hist[bin] = (hist[bin] ?? 0) + 1 / pixels;
  }
  return { rgb, hist };
}

function frameDistance(a: FrameSig, b: FrameSig): number {
  let l1 = 0;
  for (let i = 0; i < a.rgb.length; i += 1) {
    l1 += Math.abs(a.rgb[i]! - b.rgb[i]!);
  }
  const pixelDiff = l1 / (a.rgb.length * 255);

  let histDiff = 0;
  for (let i = 0; i < HIST_BINS; i += 1) {
    histDiff += Math.abs(a.hist[i]! - b.hist[i]!);
  }
  // L1 distance between normalized histograms is in [0, 2]; divide by 2 for [0, 1].
  return pixelDiff * 0.6 + (histDiff * 0.5) * 0.4;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = Math.max(0, Math.min(video.duration || time, time));
    if (Math.abs(video.currentTime - target) < 0.01 && video.readyState >= 2) {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Seek timed out"));
    }, 6000);
    const onSeeked = (): void => {
      cleanup();
      resolve();
    };
    const onError = (): void => {
      cleanup();
      reject(new Error("Could not read video frame"));
    };
    const cleanup = (): void => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = target;
  });
}

function loadVideoElement(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    if (!url.startsWith("blob:")) video.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Video took too long to load"));
    }, 15_000);
    const onLoaded = (): void => {
      cleanup();
      resolve(video);
    };
    const onError = (): void => {
      cleanup();
      reject(new Error("Could not load video for scene detection"));
    };
    const cleanup = (): void => {
      window.clearTimeout(timer);
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = url;
    video.load();
  });
}

/**
 * Scans a video clip in the browser and returns source timestamps (in seconds)
 * where visual scene cuts occur. Free and runs locally without server calls.
 */
export async function detectSceneCuts(url: string, fromSeconds: number, toSeconds: number): Promise<number[]> {
  const span = toSeconds - fromSeconds;
  if (span < 2) return [];

  const video = await loadVideoElement(url);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];

    const step = Math.max(0.25, span / 240);
    const samples: FrameDiff[] = [];
    let prev: FrameSig | null = null;

    for (let t = fromSeconds; t <= toSeconds - 0.05; t += step) {
      await seekTo(video, t);
      const sig = captureSignature(ctx, video);
      if (prev) {
        samples.push({ time: t, diff: frameDistance(prev, sig) });
      }
      prev = sig;
    }

    return pickSceneCuts(samples, { start: fromSeconds, end: toSeconds });
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}
