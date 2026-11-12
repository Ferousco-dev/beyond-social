/**
 * Keeps the videos a project plays in the browser, so the editor plays and
 * seeks from the device and not from the network.
 *
 * A video streamed from storage seeks slowly, and the editor seeks constantly
 * (every scrub, every edit that moves the playhead). On a slow link that left
 * the picture black and the playback stuck. Held locally, a seek is instant.
 *
 * Entries expire: a file older than `TTL_MS` is dropped and fetched again, and
 * only the most recent `MAX_ENTRIES` are kept, so this never grows without
 * bound. The key is the file's own id, not its signed link, so a renewed link
 * still finds the copy. Nothing here is a copy the person did not already have
 * the right to view: it is the same file the editor would have streamed.
 */
const CACHE_NAME = "bs-editor-video-v1";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 8;
/** Larger files stream as before rather than filling the device. */
const MAX_BYTES = 150 * 1024 * 1024;
const STAMP = "x-cached-at";

const keyFor = (id: string): string => `https://editor-cache.invalid/video/${encodeURIComponent(id)}`;

const available = (): boolean => typeof caches !== "undefined";

async function open(): Promise<Cache | null> {
  if (!available()) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

const stampOf = (response: Response): number => Number(response.headers.get(STAMP) ?? 0);

/** Drops expired entries, then the oldest ones past the limit. */
export async function pruneVideoCache(): Promise<void> {
  const cache = await open();
  if (!cache) return;
  const now = Date.now();
  const live: { request: Request; at: number }[] = [];
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    const at = response ? stampOf(response) : 0;
    if (!response || now - at > TTL_MS) await cache.delete(request);
    else live.push({ request, at });
  }
  live.sort((a, b) => b.at - a.at);
  for (const old of live.slice(MAX_ENTRIES)) await cache.delete(old.request);
}

const objectUrls = new Map<string, string>();

/** The local address of a video already held in this visit, without any waiting. */
export const heldVideoUrl = (id: string): string | null => objectUrls.get(id) ?? null;

/**
 * A local address for a video, or null if it is not (or cannot be) held. The
 * first call fetches `signedUrl` and keeps it; later calls, in this visit or a
 * later one before it expires, read it from the device.
 */
export function localVideoUrl(id: string, signedUrl: string): Promise<string | null> {
  const known = objectUrls.get(id);
  if (known) return Promise.resolve(known);
  // One download per file, however many times it is asked for.
  let job = inflight.get(id);
  if (!job) {
    job = queued(() => load(id, signedUrl)).finally(() => inflight.delete(id));
    inflight.set(id, job);
  }
  return job;
}

const inflight = new Map<string, Promise<string | null>>();

/** At most two downloads at once, so the background copy never starves the preview's own streaming. */
const MAX_PARALLEL = 2;
let running = 0;
const waiting: (() => void)[] = [];
async function queued<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await task();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function load(id: string, signedUrl: string): Promise<string | null> {
  const cache = await open();
  if (!cache) return null;
  try {
    const key = keyFor(id);
    let response = await cache.match(key);
    if (response && Date.now() - stampOf(response) > TTL_MS) {
      await cache.delete(key);
      response = undefined;
    }
    if (!response) {
      const fetched = await fetch(signedUrl, { priority: "low" } as RequestInit);
      if (!fetched.ok) return null;
      const length = Number(fetched.headers.get("content-length") ?? 0);
      if (length > MAX_BYTES) return null;
      const blob = await fetched.blob();
      if (blob.size === 0 || blob.size > MAX_BYTES) return null;
      const headers = new Headers({ "content-type": blob.type || "video/mp4", [STAMP]: String(Date.now()) });
      await cache.put(key, new Response(blob, { headers }));
      void pruneVideoCache();
      response = await cache.match(key);
      if (!response) return null;
    }
    const url = URL.createObjectURL(await response.blob());
    objectUrls.set(id, url);
    return url;
  } catch {
    return null;
  }
}
