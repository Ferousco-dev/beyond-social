import { siFacebook, siInstagram, siTiktok, siYoutube, type SimpleIcon } from "simple-icons";

import { cn } from "@/lib/utils";

/**
 * A platform's actual mark.
 *
 * From `simple-icons`, which ships the official path and brand hex for each,
 * rather than something drawn from memory. These are trademarks: an
 * approximation is both wrong and the kind of wrong a brand team notices, and
 * the alternative on offer was a coloured circle with a letter in it.
 *
 * Rendered as a bare `<svg>` from the path data rather than through a wrapper
 * component, so nothing ships but the four paths actually used.
 */

const ICONS: Readonly<Record<string, SimpleIcon>> = {
  tiktok: siTiktok,
  instagram: siInstagram,
  facebook: siFacebook,
  youtube: siYoutube,
};

export function PlatformLogo({
  platform,
  className,
  /**
   * False renders the mark in the current text colour, which is what a
   * disconnected or unavailable row wants: full brand colour reads as
   * available, and every row looking available was the problem.
   */
  colour = true,
}: {
  platform: string;
  className?: string;
  colour?: boolean;
}) {
  const icon = ICONS[platform];
  if (!icon) return null;

  return (
    <svg
      role="img"
      aria-label={icon.title}
      viewBox="0 0 24 24"
      // `currentColor` is the default so the mark inherits whatever the row is
      // doing, including its disabled and hover states.
      fill={colour ? `#${icon.hex}` : "currentColor"}
      className={cn("size-5 shrink-0", className)}
    >
      <path d={icon.path} />
    </svg>
  );
}
