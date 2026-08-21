import { type PendingPhoto } from "@/features/dashboard/components/compose-menu";
import { type PendingShot } from "@/features/dashboard/components/shot-list-editor";

/**
 * Filling the composer from somewhere else in the app.
 *
 * Three screens hand work to a new thread: the home composer, the idea refiner,
 * and Discover. They all leave it in session storage and navigate, and the
 * composer picks it up on mount. Session storage rather than the query string
 * because a compiled script is a couple of thousand characters of newlines and
 * quotation marks, which is not a URL.
 *
 * The keys lived as bare strings in two files that had to agree. They agree
 * here instead.
 */

const PROMPT_KEY = "bs:pending-prompt";
const PHOTOS_KEY = "bs:pending-photos";
const SHOTS_KEY = "bs:pending-shots";

export interface ComposerSeed {
  readonly prompt: string;
  /** Settled uploads only: a local blob URL means nothing on the next screen. */
  readonly photos?: readonly PendingPhoto[];
  /** Beats, when the seed came from something that had a shot list. */
  readonly shots?: readonly PendingShot[];
}

/** Leaves the seed for the composer. Does not navigate; the caller does that. */
export function leaveSeed(seed: ComposerSeed): void {
  const prompt = seed.prompt.trim();
  if (prompt === "") return;

  window.sessionStorage.setItem(PROMPT_KEY, prompt);

  const uploaded = (seed.photos ?? []).filter((photo) => photo.path !== "");
  if (uploaded.length > 0) window.sessionStorage.setItem(PHOTOS_KEY, JSON.stringify(uploaded));

  if (seed.shots && seed.shots.length > 0) {
    window.sessionStorage.setItem(SHOTS_KEY, JSON.stringify(seed.shots));
  }
}

/**
 * Reads a stored value and clears it, whether or not it parses.
 *
 * Clearing regardless is deliberate: a seed that cannot be read is a seed that
 * will never be read, and leaving it behind means it turns up on the next new
 * thread instead.
 */
function takeJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const raw = window.sessionStorage.getItem(key);
  window.sessionStorage.removeItem(key);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    // Session storage is client-controlled, so a hand-edited value must not
    // take the composer down with it.
    return null;
  }
}

export interface TakenSeed {
  readonly prompt: string | null;
  readonly photos: readonly PendingPhoto[] | null;
  readonly shots: readonly PendingShot[] | null;
}

/** Takes everything left for this screen, clearing it as it goes. */
export function takeSeed(fallbackPrompt: string | null): TakenSeed {
  const stored = window.sessionStorage.getItem(PROMPT_KEY);
  window.sessionStorage.removeItem(PROMPT_KEY);

  const prompt = fallbackPrompt ?? stored;
  if (prompt === null) {
    // Nothing was seeded, so anything else in storage belongs to a navigation
    // that never completed. Cleared rather than left to attach itself to a
    // thread the user starts by hand later.
    window.sessionStorage.removeItem(PHOTOS_KEY);
    window.sessionStorage.removeItem(SHOTS_KEY);
    return { prompt: null, photos: null, shots: null };
  }

  return {
    prompt,
    photos: takeJson(PHOTOS_KEY, (value): value is readonly PendingPhoto[] => Array.isArray(value)),
    shots: takeJson(SHOTS_KEY, (value): value is readonly PendingShot[] => Array.isArray(value)),
  };
}
