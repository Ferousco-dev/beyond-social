"use client";

import { AudioLines, ImageOff } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type LibraryItem } from "../types";

/**
 * One tile in the library.
 *
 * The whole tile is a single link to the thread the item was sent in, which is
 * the one thing this page is for. That rules out an inline audio player: a
 * `<audio controls>` inside a link puts interactive controls inside a larger
 * hit target, so a click on play would also navigate. Voice clips are played in
 * the thread, where the transport is not competing with a link.
 *
 * Photos are plain `img` rather than `next/image` for the same reason as the
 * thread: the source is a signed URL into a private bucket that changes on every
 * read, so the optimiser would cache under a key that is never hit twice.
 */

function formatSent(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Preview({ item }: { item: LibraryItem }): ReactNode {
  if (item.kind === "audio") {
    return (
      <div className="flex size-full items-center justify-center bg-muted">
        <AudioLines className="size-8 text-ink-soft" aria-hidden />
      </div>
    );
  }

  if (item.url === null) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-muted px-2 text-center">
        <ImageOff className="size-6 text-ink-soft" aria-hidden />
        <span className="text-[11px] leading-tight text-ink-soft">Preview unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      // The picture is the user's own upload and nobody has described it.
      // Inventing a description would be worse than leaving the tile's label,
      // which already names what it is and where it goes.
      alt=""
      loading="lazy"
      className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    />
  );
}

export function LibraryCard({ item }: { item: LibraryItem }): ReactNode {
  const sent = formatSent(item.createdAt);
  const noun = item.kind === "audio" ? "Voice clip" : "Photo";

  return (
    <li>
      <Link
        href={`/dashboard/c/${item.projectId}` as Route}
        aria-label={`${noun} sent in ${item.projectTitle}${sent === "" ? "" : ` on ${sent}`}. Open the chat.`}
        className="group block overflow-hidden rounded-2xl border border-hairline bg-paper transition-colors hover:border-ink-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="relative aspect-square overflow-hidden">
          <Preview item={item} />
        </div>

        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-medium text-ink" title={item.projectTitle}>
            {item.projectTitle}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {noun}
            {sent === "" ? "" : ` · ${sent}`}
          </p>
        </div>
      </Link>
    </li>
  );
}
