import { Mic, Package, UserRound } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ComponentType, type ReactNode } from "react";

/**
 * The first-time view of the assets page.
 *
 * When nothing is saved, the four-panel workspace of the populated state reads
 * as four half-built ideas next to one another. This is the opposite: a single
 * row of three cards, each one clear about what it is and one click to start.
 * Everything else on the page is hidden until there is something to show
 * against, including the tabs and the search box.
 *
 * No secondary actions. A first-time visitor needs to know where to start, not
 * every button that will exist once they have.
 */

interface Card {
  readonly icon: ComponentType<{ className?: string }>;
  readonly title: string;
  readonly body: string;
  readonly action: string;
  readonly href: Route;
}

const CARDS: readonly Card[] = [
  {
    icon: UserRound,
    title: "Record your avatar",
    body: "About a minute of you, once. Every future video can be made in your face and voice.",
    action: "Start recording",
    href: "/dashboard/avatar/new" as Route,
  },
  {
    icon: Mic,
    title: "Add your voice",
    body: "One short line read aloud. Videos can then be narrated in your voice without another take.",
    action: "Record a sample",
    // The recorder lives in the voice section below; the section id anchors
    // to it once the workspace has content, so this stays a route even in the
    // empty state, back to the same page.
    href: "/dashboard/assets#voice" as Route,
  },
  {
    icon: Package,
    title: "Save a product photo",
    body: "A photo of what you sell, so a video shows the real thing instead of a stand-in.",
    action: "Add a photo",
    href: "/dashboard/assets#products" as Route,
  },
];

export function GetStarted(): ReactNode {
  return (
    <section aria-labelledby="get-started-heading" className="rounded-2xl bg-paper p-6 sm:p-8">
      <h2 id="get-started-heading" className="text-lg font-semibold tracking-[-0.01em] text-ink">
        Start with any one of these
      </h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
        Nothing is saved yet. Pick the one you want first; the rest can wait until you need them.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {CARDS.map((card) => (
          <article
            key={card.title}
            className="flex flex-col rounded-xl border border-hairline bg-canvas p-5 transition-colors hover:border-primary/40"
          >
            <span
              aria-hidden
              className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <card.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-ink">{card.title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">{card.body}</p>
            <Link
              href={card.href}
              className="mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {card.action}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
