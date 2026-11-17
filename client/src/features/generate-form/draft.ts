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
