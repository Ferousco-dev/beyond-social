import { type ReactNode } from "react";

/**
 * A titled region of a page. Sections are separated by a heading and space, not
 * by nested cards, so a page reads as one document rather than a wall of tiles.
 */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="text-sm text-ink-soft">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
