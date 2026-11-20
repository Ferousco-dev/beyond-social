/**
 * Extracts and caches small timeline filmstrip thumbnails for video clips.
 * Work is serialized per video URL so we reuse one decoder and never stall playback.
 */

const MAX_CACHE = 240;
const THUMB_HEIGHT = 56;
const cache = new Map<string, string>();
const queues = new Map<string, Promise<void>>();

const cacheKey = (url: string, time: number): string => `${url}|${Math.round(time * 4)}`;

export function cachedThumbnail(url: string, time: number): string | undefined {
  return cache.get(cacheKey(url, time));
}

function store(key: string, dataUrl: string): void {
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, dataUrl);
}

function waitSeek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = Math.max(0, Math.min(Math.max(0, (video.duration || time) - 0.05), time));
    if (Math.abs(video.currentTime - target) < 0.02 && video.readyState >= 2) {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, 5000);
    const done = (): void => {
      cleanup();
      resolve();
    };
    const fail = (): void => {
      cleanup();
      reject(new Error("error"));
    };
    const cleanup = (): void => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", fail, { once: true });
    video.currentTime = target;
  });
}

function openVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    if (!url.startsWith("blob:")) video.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, 10_000);
    const done = (): void => {
      cleanup();
      resolve(video);
    };
    const fail = (): void => {
      cleanup();
      reject(new Error("error"));
    };
    const cleanup = (): void => {
      window.clearTimeout(timer);
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("error", fail, { once: true });
    video.src = url;
    video.load();
  });
}

/**
 * Decodes thumbnails for the requested source timestamps (in seconds), calling
 * `onFrame` as each one is ready. Skips timestamps already cached.
 */
export function loadThumbnails(
  url: string,
  times: readonly number[],
  onFrame: (time: number, dataUrl: string) => void,
  signal: AbortSignal,
): void {
  const missing: number[] = [];
  for (const t of times) {
    const hit = cache.get(cacheKey(url, t));
    if (hit) onFrame(t, hit);
    else missing.push(t);
  }
  if (missing.length === 0) return;

  const prev = queues.get(url) ?? Promise.resolve();
  const next = prev.then(async () => {
    if (signal.aborted) return;
    const stillMissing = missing.filter((t) => !cache.has(cacheKey(url, t)));
    if (stillMissing.length === 0) {
      for (const t of missing) {
        const hit = cache.get(cacheKey(url, t));
        if (hit && !signal.aborted) onFrame(t, hit);
      }
      return;
    }
    let video: HTMLVideoElement | null = null;
    try {
      video = await openVideo(url);
      if (signal.aborted || video.videoWidth <= 0 || video.videoHeight <= 0) return;
      const width = Math.max(24, Math.min(120, Math.round((video.videoWidth / video.videoHeight) * THUMB_HEIGHT)));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = THUMB_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      for (const t of stillMissing) {
        if (signal.aborted) break;
        try {
          await waitSeek(video, t);
          if (signal.aborted) break;
          ctx.drawImage(video, 0, 0, width, THUMB_HEIGHT);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          store(cacheKey(url, t), dataUrl);
          onFrame(t, dataUrl);
        } catch {
          // Skip unreadable frames silently; the clip still renders cleanly.
        }
      }
    } catch {
      // Video couldn't be decoded (e.g. CORS); fall back to plain clip background.
    } finally {
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    }
  });
  queues.set(
    url,
    next.catch(() => undefined),
  );
}
