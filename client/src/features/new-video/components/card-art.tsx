import { type ReactNode } from "react";

import { type NewVideoOptionId } from "../options";

/**
 * Small artwork for each starting point. Plain SVG drawn with the theme
 * tokens, so it follows light and dark without extra files to load.
 */
export function CardArt({ id }: { id: NewVideoOptionId }): ReactNode {
  return (
    <svg viewBox="0 0 120 72" className="h-full w-full" fill="none" aria-hidden>
      {id === "trending" ? (
        <>
          <rect x="10" y="40" width="14" height="22" rx="4" className="fill-primary/25" />
          <rect x="30" y="30" width="14" height="32" rx="4" className="fill-primary/40" />
          <rect x="50" y="34" width="14" height="28" rx="4" className="fill-primary/55" />
          <rect x="70" y="18" width="14" height="44" rx="4" className="fill-primary/75" />
          <path d="M12 34 L38 24 L58 28 L96 8" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="96" cy="8" r="5" className="fill-primary" />
        </>
      ) : null}
      {id === "link" ? (
        <>
          <rect x="14" y="14" width="64" height="44" rx="8" className="fill-primary/15 stroke-primary/50" strokeWidth="2" />
          <path d="M40 28 L56 36 L40 44 Z" className="fill-primary" />
          <rect x="62" y="34" width="44" height="22" rx="11" className="fill-paper stroke-primary" strokeWidth="2.5" />
          <path d="M74 45 H94" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : null}
      {id === "idea" ? (
        <>
          <circle cx="60" cy="30" r="20" className="fill-primary/20 stroke-primary" strokeWidth="2.5" />
          <path d="M52 52 H68 M54 60 H66" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 20 V32 M54 26 H66" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
          <path d="M16 14 l4 4 M104 14 l-4 4 M12 34 h6 M102 34 h6" className="stroke-primary/60" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : null}
      {id === "avatar" ? (
        <>
          <circle cx="60" cy="26" r="14" className="fill-primary/30 stroke-primary" strokeWidth="2.5" />
          <path d="M32 66 C32 48 46 42 60 42 C74 42 88 48 88 66" className="fill-primary/15 stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M96 22 q6 6 0 12 M102 16 q10 12 0 24" className="stroke-primary/70" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}
