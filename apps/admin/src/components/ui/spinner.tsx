import { type ReactNode } from "react";

import { cn } from "./cn";

/**
 * The one spinner.
 *
 * There were thirty seven copies of a lucide icon with `animate-spin` on it,
 * which meant the loading state was a decision each caller made again rather
 * than a thing the product has. This is the thing the product has.
 *
 * Sized by the caller with the same `size-*` utility the icon used, and drawn
 * in `currentColor`, so it inherits both the size and the colour of whatever is
 * loading and needs no variants.
 *
 * Hidden from assistive technology by default, because a spinner almost always
 * sits next to the word that already says what is happening, and reading both
 * is worse than reading one. Pass `label` where it stands alone.
 */
export function Spinner({
  className,
  label,
}: {
  className?: string;
  /** Announced when the spinner is the only sign that anything is happening. */
  label?: string;
}): ReactNode {
  return (
    <span
      className={cn("spinner shrink-0", className)}
      {...(label === undefined ? { "aria-hidden": true } : { role: "status", "aria-label": label })}
    />
  );
}
