/**
 * The class strings the account forms share.
 *
 * Defined once so the three action forms cannot drift into three slightly
 * different text fields. Every value is a semantic token from the console's
 * theme, never a raw colour.
 */

export const FIELD =
  "h-9 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink " +
  "placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

export const LABEL = "block text-xs font-medium text-ink-soft";

export const BUTTON =
  "inline-flex h-9 cursor-pointer items-center rounded-lg px-3.5 text-sm font-medium " +
  "transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

export const BUTTON_PRIMARY = `${BUTTON} bg-ink text-canvas`;

export const BUTTON_DANGER = `${BUTTON} border border-destructive/30 bg-destructive/10 text-destructive`;
