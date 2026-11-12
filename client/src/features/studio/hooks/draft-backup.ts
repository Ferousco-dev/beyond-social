/**
 * A copy of unsaved edits kept on this device, so a failed save, a dropped
 * connection or a closed tab never costs the person their work. It is only
 * ever read back for the same project at the same saved version.
 */
const PREFIX = "bs:editor-backup:";
/** Skip a copy this large rather than fill the browser's storage. */
const MAX_CHARS = 4_000_000;

export interface DraftBackup {
  readonly version: number;
  readonly title: string;
  readonly document: unknown;
}

export function saveBackup(id: string, backup: DraftBackup): void {
  try {
    const raw = JSON.stringify(backup);
    if (raw.length <= MAX_CHARS) window.localStorage.setItem(PREFIX + id, raw);
  } catch {
    // Storage is full or blocked; the server save is still the main copy.
  }
}

export function readBackup(id: string): DraftBackup | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + id);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { version, title, document } = value as Record<string, unknown>;
    if (typeof version !== "number" || typeof title !== "string" || document === undefined) return null;
    return { version, title, document };
  } catch {
    return null;
  }
}

export function clearBackup(id: string): void {
  try {
    window.localStorage.removeItem(PREFIX + id);
  } catch {
    // Nothing to clear.
  }
}
