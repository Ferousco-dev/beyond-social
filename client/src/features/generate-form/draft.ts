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

/** The saved form exactly as stored, so a discard can be undone. */
export interface DraftSnapshot {
  readonly draft: string | null;
  readonly step: string | null;
}

export function snapshotDraft(): DraftSnapshot {
  try {
    return { draft: window.localStorage.getItem(DRAFT_KEY), step: window.localStorage.getItem(STEP_KEY) };
  } catch {
    return { draft: null, step: null };
  }
}

export function restoreDraft(snapshot: DraftSnapshot): void {
  try {
    if (snapshot.draft !== null) window.localStorage.setItem(DRAFT_KEY, snapshot.draft);
    if (snapshot.step !== null) window.localStorage.setItem(STEP_KEY, snapshot.step);
  } catch {
    // Storage is unavailable; there was nothing saved to bring back.
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
  /** What the video is about, or empty when only the script was filled in. */
  title: string;
}

let cached: { raw: string | null; summary: DraftSummary | null } = { raw: null, summary: null };

/**
 * A short description of the unfinished video, or null when there is none.
 * Returns the same object while the saved text is unchanged, so it is safe
 * to hand to useSyncExternalStore.
 */
export function draftSummary(): DraftSummary | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  const key = raw ?? "";
  if (cached.raw === key) return cached.summary;
  let summary: DraftSummary | null = null;
  try {
    const values = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    const text = (name: string): string => (typeof values?.[name] === "string" ? (values[name] as string).trim() : "");
    const filled = text("idea") || text("objective") || text("hook") || text("scenes") || text("dialogue");
    if (values && filled) summary = { title: text("title") || text("objective") || text("idea") };
  } catch {
    summary = null;
  }
  cached = { raw: key, summary };
  return summary;
}
