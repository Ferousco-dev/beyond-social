"use client";

import { ArrowRight, Clock, Lightbulb, Package, PenLine, TrendingUp } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

/**
 * Where a new video starts.
 *
 * A blank textarea is the hardest possible first screen: it asks for a finished
 * thought before the person has had one. These are the three ways in that people
 * actually arrive with, borrow something that is working, bring a half-formed
 * idea, or have a thing to sell and a photo of it, plus a way past all of them
 * for anybody who already knows what they want.
 */
export function StartScreen({
  onRefine,
  onSkip,
  recents = [],
}: {
  onRefine: () => void;
  onSkip: () => void;
  /** The last few projects, so starting fresh does not hide the work in flight. */
  recents?: readonly { id: string; title: string }[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper px-3.5 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
          <Lightbulb className="size-3.5" aria-hidden />
          Content intelligence
        </span>
        <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Where do you want to start?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-sm text-ink-soft">
          Borrow what is working on TikTok, turn a rough idea into a brief, or put your own product
          on screen.
        </p>
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={"/dashboard/trends" as Route}
          className="group flex flex-col rounded-2xl border border-hairline bg-paper p-6 transition-colors hover:border-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-cloud">
            <TrendingUp className="size-5 text-ink-soft transition-colors group-hover:text-ink" />
          </span>
          <h2 className="mt-5 text-base font-semibold text-ink">Find what is working</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            Search TikTok by topic, scroll real posts, and pick one to build from.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
            Search TikTok
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </Link>

        <button
          type="button"
          onClick={onRefine}
          className="group flex cursor-pointer flex-col rounded-2xl border border-hairline bg-paper p-6 text-left transition-colors hover:border-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-cloud">
            <Lightbulb className="size-5 text-ink-soft transition-colors group-hover:text-ink" />
          </span>
          <h2 className="mt-5 text-base font-semibold text-ink">Refine my idea</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            Bring a rough concept. You will be asked a few things, then handed a brief.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
            Start refining
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </button>

        {/* The third way in, and the one nobody could find. Featuring a real
            product has worked since products were added, but the only route to
            it was knowing to attach a photo from the plus menu inside a thread. */}
        <Link
          href={"/dashboard/assets" as Route}
          className="group flex flex-col rounded-2xl border border-hairline bg-paper p-6 transition-colors hover:border-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-cloud">
            <Package className="size-5 text-ink-soft transition-colors group-hover:text-ink" />
          </span>
          <h2 className="mt-5 text-base font-semibold text-ink">Feature a product</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
            Upload a photo of what you sell, and the video features that exact thing.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
            Go to your assets
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </Link>
      </div>

      {recents.length > 0 ? (
        // Below the two ways in, not above them: this screen is for starting
        // something, and the work already under way is what you reach for when
        // that turns out not to be what you came for.
        <section className="mt-9">
          <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
            <Clock className="size-3.5" aria-hidden />
            Pick up where you left off
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {recents.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/dashboard/c/${project.id}` as Route}
                  className="inline-flex max-w-xs cursor-pointer items-center rounded-full border border-hairline bg-paper px-4 py-2 text-sm text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="truncate">{project.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <PenLine className="size-4" aria-hidden />I know what I want, just let me type it
        </button>
      </div>
    </div>
  );
}
