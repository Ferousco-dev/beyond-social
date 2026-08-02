/**
 * What customers say.
 *
 * ============================ PLACEHOLDER ============================
 * Every quote below is invented and must be replaced before this page is
 * shown to anyone. They exist so the section can be built and reviewed,
 * not so it can ship.
 *
 * Fabricated testimonials are not a design detail. They are claims about
 * real people that the reader is meant to believe, and inventing them is
 * the difference between a landing page and a lie. Replace with quotes
 * you have permission to publish, attributed to people who said them.
 *
 * `TESTIMONIALS_ARE_PLACEHOLDER` below is read by the component, which
 * refuses to render while it is true. Set it to false once these are
 * real, and not before.
 * =====================================================================
 */

export const TESTIMONIALS_ARE_PLACEHOLDER = true;

export interface Testimonial {
  /** The full name, as it should appear. */
  readonly name: string;
  /** Their handle, without the @. */
  readonly handle: string;
  /** One or two sentences. Longer than that and nobody reads the row. */
  readonly quote: string;
}

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    name: "Replace me",
    handle: "placeholder",
    quote: "A real quote from a real customer goes here, in their own words.",
  },
  {
    name: "Replace me",
    handle: "placeholder",
    quote: "Two sentences at most. Specific beats enthusiastic every time.",
  },
  {
    name: "Replace me",
    handle: "placeholder",
    quote: "Name the thing it replaced, or the hours it saved, or the result.",
  },
  {
    name: "Replace me",
    handle: "placeholder",
    quote: "Quotes that mention a number are the ones people believe.",
  },
  {
    name: "Replace me",
    handle: "placeholder",
    quote: "Keep the voice theirs. Polished copy reads as written by us.",
  },
  {
    name: "Replace me",
    handle: "placeholder",
    quote: "Six is enough to fill the rows without repeating too obviously.",
  },
];

/** The initials shown in place of a photo, so no face is invented. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
