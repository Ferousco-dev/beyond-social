export const DRAFT_KEY = "bs:generate-draft";
export const STEP_KEY = "bs:generate-step";

/** Drafts live in localStorage, so they survive a new tab, a redirect to Assets and a closed browser. */
export function readDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Forgets the saved form once its video has started, so the next one opens empty. */
export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(STEP_KEY);
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}

export interface DraftSummary {
  /** The first words of what the video is for, or empty when only later steps were filled in. */
  title: string;
  /** One-based step the person was on. */
  step: number;
}

let cached: { raw: string | null; summary: DraftSummary | null } = { raw: null, summary: null };

/**
 * A short description of the unfinished video, or null when there is none.
 * Returns the same object while the saved text is unchanged, so it is safe
 * to hand to useSyncExternalStore.
 */
export function draftSummary(): DraftSummary | null {
  let raw: string | null = null;
  let stepRaw: string | null = null;
  try {
    raw = window.localStorage.getItem(DRAFT_KEY);
    stepRaw = window.localStorage.getItem(STEP_KEY);
  } catch {
    return null;
  }
  const key = `${raw ?? ""}|${stepRaw ?? ""}`;
  if (cached.raw === key) return cached.summary;
  let summary: DraftSummary | null = null;
  try {
    const values = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    const text = (name: string): string => (typeof values?.[name] === "string" ? (values[name] as string).trim() : "");
    const filled = text("objective") || text("hook") || text("scenes") || text("dialogue");
    if (values && filled) {
      const step = Number(stepRaw);
      summary = { title: text("objective").slice(0, 80), step: Number.isInteger(step) && step >= 0 ? step + 1 : 1 };
    }
  } catch {
    summary = null;
  }
  cached = { raw: key, summary };
  return summary;
}
