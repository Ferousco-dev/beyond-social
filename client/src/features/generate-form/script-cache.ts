/** The words a length rewrite produces, which is all the cache keeps. */
export interface CachedScript {
  readonly hook: string;
  readonly scenes: string;
  readonly dialogue: string;
}

interface Entry extends CachedScript {
  readonly key: string;
  readonly at: number;
}

/** How long a script written for one length is reused before our AI writes it again. */
export const SCRIPT_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 12;
const STORAGE_KEY = "bs:script-cache";

/** The small part of Storage the cache needs, so tests can hand it a plain object. */
export interface ScriptStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const keyFor = (source: string, seconds: number): string => `${seconds}|${source.trim()}`;

function read(store: ScriptStore, now: number): Entry[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return (parsed as Entry[]).filter((entry) => typeof entry?.key === "string" && typeof entry.at === "number" && now - entry.at < SCRIPT_TTL_MS);
  } catch {
    return [];
  }
}

function write(store: ScriptStore, entries: readonly Entry[]): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    return;
  }
}

/**
 * The script already written for this idea at this length, if it is recent.
 * Going 8s, 10s, 8s shows the 8s script again at once instead of paying our
 * AI to write it a second time.
 */
export function recallScript(store: ScriptStore, source: string, seconds: number, now = Date.now()): CachedScript | null {
  const hit = read(store, now).find((entry) => entry.key === keyFor(source, seconds));
  return hit ? { hook: hit.hook, scenes: hit.scenes, dialogue: hit.dialogue } : null;
}

/** Keeps a script for this idea and length. Old and expired ones are dropped. */
export function rememberScript(store: ScriptStore, source: string, seconds: number, script: CachedScript, now = Date.now()): void {
  if (source.trim() === "" || (script.hook === "" && script.scenes === "" && script.dialogue === "")) return;
  const key = keyFor(source, seconds);
  write(store, [{ key, at: now, hook: script.hook, scenes: script.scenes, dialogue: script.dialogue }, ...read(store, now).filter((entry) => entry.key !== key)]);
}
