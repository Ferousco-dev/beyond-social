/**
 * What the editor's keyboard shortcuts are, written down once.
 *
 * `use-editor-shortcuts` binds them and this names them, so the help sheet is a
 * reading of the same list rather than a second one that drifts. There was no
 * help sheet at all until now: a user found the shortcuts by pressing a key and
 * seeing what happened, which for Delete is an expensive way to learn.
 *
 * The accelerator is written as the symbol on the key rather than "Meta", and
 * resolved per platform at render, because "Cmd-Z" on Windows is wrong and
 * "Ctrl-Z" on a Mac is wrong in the other direction.
 */

export interface Shortcut {
  /** Key names as they read on the key itself, in press order. */
  readonly keys: readonly string[];
  readonly action: string;
}

export interface ShortcutGroup {
  readonly title: string;
  readonly shortcuts: readonly Shortcut[];
}

/** Replaced with the platform's accelerator when the group is rendered. */
export const ACCEL = "%accel%";

export const EDITOR_SHORTCUTS: readonly ShortcutGroup[] = [
  {
    title: "Playback",
    shortcuts: [
      { keys: ["Space"], action: "Play or pause" },
      { keys: ["←"], action: "Step back" },
      { keys: ["→"], action: "Step forward" },
      { keys: ["Home"], action: "Jump to the start" },
      { keys: ["End"], action: "Jump to the end" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: ["S"], action: "Split at the playhead" },
      { keys: [ACCEL, "D"], action: "Duplicate the selected clip" },
      { keys: ["Delete"], action: "Remove the selected clip" },
      { keys: ["Esc"], action: "Deselect" },
      { keys: [ACCEL, "Z"], action: "Undo" },
      { keys: [ACCEL, "Shift", "Z"], action: "Redo" },
    ],
  },
  {
    title: "Everywhere",
    shortcuts: [
      { keys: [ACCEL, "K"], action: "Open the command palette" },
      { keys: ["?"], action: "Show this list" },
    ],
  },
];

/**
 * The accelerator key for this device.
 *
 * `navigator.platform` is deprecated but is the only thing that answers this in
 * every browser we support; the check is a substring so it survives both the
 * "MacIntel" and "Mac" spellings. Defaults to Ctrl, which is right everywhere
 * except one platform and is the safer thing to be wrong about.
 */
export function accelerator(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  return /mac|iphone|ipad/i.test(navigator.platform) ? "⌘" : "Ctrl";
}
