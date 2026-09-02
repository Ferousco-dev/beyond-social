import { UserRound, Video } from "lucide-react";
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
export function LibraryHeader({ hasTwin }: { hasTwin: boolean }): ReactNode {
  return (
    <header className="flex flex-col gap-5 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
          Your creative library
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Your face, your voice and your products, saved once. Every video is made from what is
          here, and anything on this page can be attached from the plus button in the message box.
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
    </header>
  );
}
