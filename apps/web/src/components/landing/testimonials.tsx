import { type ReactNode } from "react";

import {
  initialsOf,
  TESTIMONIALS,
  TESTIMONIALS_ARE_PLACEHOLDER,
  type Testimonial,
} from "@/lib/marketing/testimonials";

import { SectionHeading } from "./section-heading";

/**
 * What customers say.
 *
 * Three rows drifting in alternating directions, masked at both edges so they
 * appear to continue past the viewport rather than starting and stopping. The
 * alternation matters: rows moving the same way read as one block sliding,
 * where opposing rows read as a wall of separate voices.
 *
 * Renders nothing while the quotes are placeholders. A testimonial is a claim
 * about a real person, and a section that quietly ships with invented ones is
 * worse than a section that is missing.
 */

/** Enough copies that the row never runs out mid-viewport on a wide screen. */
const REPEATS = 3;

function Card({ item }: { item: Testimonial }): ReactNode {
  return (
    <figure className="flex w-[19rem] shrink-0 flex-col gap-3 rounded-2xl border border-hairline bg-paper/60 p-5 backdrop-blur-sm sm:w-[21rem]">
      <figcaption className="flex items-center gap-3">
        {/* Initials rather than a photograph. A stock face repeated across a
            testimonial wall is the clearest possible signal that the quotes are
            invented, and inventing faces for people who said nothing is not a
            thing worth doing well. */}
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-semibold text-ink-soft"
        >
          {initialsOf(item.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
          <span className="block truncate text-xs text-ink-soft">@{item.handle}</span>
        </span>
      </figcaption>
      <blockquote className="text-pretty text-sm leading-relaxed text-ink-soft">
        {item.quote}
      </blockquote>
    </figure>
  );
}

function Row({
  items,
  reverse,
  seconds,
}: {
  items: readonly Testimonial[];
  reverse?: boolean;
  seconds: number;
}): ReactNode {
  return (
    <div className="flex gap-4">
      {/*
        The track holds the list twice over and travels exactly half its width,
        so the second copy lands where the first began and the loop has no seam.
        Duplicated content is hidden from assistive tech; the quotes are read
        once, in the source order, from the first copy.
      */}
      <div
        style={{ animationDuration: `${seconds}s` }}
        className={`flex shrink-0 gap-4 motion-safe:animate-[marquee_linear_infinite] ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
      >
        {Array.from({ length: 2 }).flatMap((_, copy) =>
          items.map((item, index) => (
            <div key={`${copy}-${index}`} aria-hidden={copy === 1 ? true : undefined}>
              <Card item={item} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}

export function Testimonials(): ReactNode {
  if (TESTIMONIALS_ARE_PLACEHOLDER) return null;

  // Each row starts at a different point in the list, so the same quote is not
  // sitting directly above itself in the next row.
  const pool = Array.from({ length: REPEATS }).flatMap(() => TESTIMONIALS);
  const rows = [
    pool,
    [...pool.slice(2), ...pool.slice(0, 2)],
    [...pool.slice(4), ...pool.slice(0, 4)],
  ];

  return (
    <section className="overflow-hidden py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Testimonials"
          title="What our users are saying"
          description="Teams using Beyond Social to turn one idea into a week of posts."
        />
      </div>

      {/* Masked at both edges so the rows read as continuing past the screen
          rather than being cut off by it. */}
      <div className="mt-12 flex flex-col gap-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        {rows.map((items, index) => (
          <Row key={index} items={items} reverse={index % 2 === 1} seconds={70 + index * 14} />
        ))}
      </div>
    </section>
  );
}
