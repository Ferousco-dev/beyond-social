import { Images, UserRound, Video } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

/**
 * The top of the creative library.
 *
 * The page used to open with the word "Assets" and a paragraph, on a column
 * narrow enough that a desktop showed more empty space than content. What
 * somebody actually arrives here to do is add something, so the two ways of
 * doing that sit in the header rather than being found by scrolling.
 *
 * Only two actions, both real routes. A header full of controls that open
 * nothing is the thing this is replacing.
 */
export function LibraryHeader({
  hasTwin,
  assetCount,
}: {
  hasTwin: boolean;
  assetCount: number;
}): ReactNode {
  return (
    <header className="relative overflow-hidden border-b border-hairline pb-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
            <Images className="size-3.5" aria-hidden />
            Creative materials
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
              Your creative library
            </h1>
            {assetCount > 0 ? (
              <span className="text-sm tabular-nums text-ink-soft">
                {assetCount} {assetCount === 1 ? "asset" : "assets"}
              </span>
            ) : null}
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Build a reusable visual vocabulary for your videos. Save the real people, products and
            recordings you want the creative tools to work from.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={"/dashboard/avatar/new" as Route}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Video className="size-4" aria-hidden />
            {hasTwin ? "Record another" : "Record your avatar"}
          </Link>
          <Link
            href="#products"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <UserRound className="size-4" aria-hidden />
            Add a product photo
          </Link>
        </div>
      </div>
    </header>
  );
}
