"use client";

import { Mic, Package, UserRound } from "lucide-react";
import { type ComponentType, type ReactNode } from "react";

/**
 * Jumping between the three things this page holds.
 *
 * Anchors rather than routes, and rather than tabs. Settings splits into real
 * routes because connecting a social account leaves for an OAuth round trip and
 * needs a URL to come back to; nothing here leaves the page. Tabs were the
 * other option and were rejected for a plainer reason: with three sections,
 * hiding two of them to show one is work for the reader, not less of it.
 *
 * The counts are real. A number here that did not match what is below it would
 * be worse than no number, so a section with nothing saved shows nothing rather
 * than a zero dressed up as a state.
 */

interface Section {
  readonly id: string;
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
}

const SECTIONS: readonly Section[] = [
  { id: "avatar", label: "Avatar", icon: UserRound },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "products", label: "Products", icon: Package },
];

export function AssetSectionNav({
  counts,
}: {
  counts: Readonly<Record<string, number>>;
}): ReactNode {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-10 -mx-4 overflow-x-auto border-b border-hairline bg-canvas/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <ul className="flex min-w-max items-center gap-1 py-3">
        {SECTIONS.map((section) => {
          const count = counts[section.id] ?? 0;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-transparent px-3 text-sm text-ink-soft transition-colors hover:border-hairline hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <section.icon className="size-4" aria-hidden />
                {section.label}
                {count > 0 ? (
                  <span className="rounded-full bg-cloud px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-soft">
                    {count}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * One section, with the heading the nav points at.
 *
 * `scroll-mt` keeps the heading clear of the sticky bar; without it an anchor
 * lands with the title hidden underneath, which reads as the wrong section.
 */
export function AssetSection({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`scroll-mt-24 ${className ?? ""}`}
    >
      <div className="mb-4">
        <h2
          id={`${id}-heading`}
          className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft"
        >
          {title}
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft/80">{description}</p>
      </div>
      {children}
    </section>
  );
}
