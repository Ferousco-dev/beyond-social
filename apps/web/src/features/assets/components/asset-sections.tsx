"use client";

import { type ReactNode } from "react";

/**
 * Jumping between the three things this page holds.
 *
 * Anchors rather than routes. Settings splits into real routes because
 * connecting a social account leaves for an OAuth round trip and needs a URL to
 * come back to; nothing here leaves the page, and three short sections read
 * better as one scroll than as three navigations.
 *
 * Sticky, because the point of a section list is being able to reach it after
 * you have scrolled past it. It scrolls sideways on a phone rather than
 * wrapping, so the row stays one line at any width.
 */

export interface AssetSection {
  readonly id: string;
  readonly label: string;
}

export const ASSET_SECTIONS: readonly AssetSection[] = [
  { id: "avatar", label: "Avatar" },
  { id: "voice", label: "Voice" },
  { id: "products", label: "Products" },
];

export function AssetSectionNav(): ReactNode {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-10 -mx-4 mb-6 overflow-x-auto border-b border-hairline bg-paper/85 px-4 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <ul className="flex min-w-max items-center gap-1 py-2">
        {ASSET_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="inline-flex rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {section.label}
            </a>
          </li>
        ))}
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
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 pb-10">
      <h2 id={`${id}-heading`} className="text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-1 mb-4 max-w-xl text-sm text-ink-soft">{description}</p>
      {children}
    </section>
  );
}
