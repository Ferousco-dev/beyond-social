/**
 * The class strings this feature's controls share.
 *
 * Deliberately the same shapes the account forms use, so the restore control
 * reads as part of the same console rather than as a page that invented its own
 * buttons. Every value is a semantic token from the console's theme, never a
 * raw colour.
 */

export const BUTTON =
  "inline-flex h-9 cursor-pointer items-center rounded-lg px-3.5 text-sm font-medium " +
  "transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

export const BUTTON_PRIMARY = `${BUTTON} bg-ink text-canvas`;

export const BUTTON_QUIET = `${BUTTON} border border-hairline text-ink hover:bg-cloud`;
