"use client";

import { AudioLines, Film, ImageOff, type LucideIcon } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { type LibraryItem, type LibraryKind } from "../types";

/** What each kind is called on the tile and to a screen reader. */
const NOUN: Record<LibraryKind, string> = {
  photo: "Photo",
  audio: "Voice clip",
  video: "Generated video",
};

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

/** Shown when an object could not be signed, rather than a broken frame. */
function Unavailable({ icon: Icon, label }: { icon: LucideIcon; label: string }): ReactNode {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-muted px-2 text-center">
      <Icon className="size-6 text-ink-soft" aria-hidden />
      <span className="text-xs leading-tight text-ink-soft">{label}</span>
    </div>
  );
}

function Preview({ item }: { item: LibraryItem }): ReactNode {
  if (item.kind === "video") {
    if (item.url === null) return <Unavailable icon={Film} label="Video unavailable" />;
    return (
      // A `video` with `preload="metadata"` rather than a poster image, because
      // there is no thumbnail column anywhere in the schema: the only real
      // frame available is the one the browser draws from the file itself.
      // Muted and not controllable, so the tile stays a single link.
      <video
        src={item.url}
        preload="metadata"
        muted
        playsInline
        aria-hidden
        tabIndex={-1}
        className="size-full bg-muted object-cover"
      />
    );
  }

  if (item.kind === "audio") {
    return (
      <div className="flex size-full items-center justify-center bg-muted">
        <AudioLines className="size-8 text-ink-soft" aria-hidden />
      </div>
    );
  }

  if (item.url === null) return <Unavailable icon={ImageOff} label="Preview unavailable" />;

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
  const noun = NOUN[item.kind];

  return (
    <li>
      <Link
        href={`/dashboard/c/${item.projectId}` as Route}
        aria-label={`${noun} in ${item.projectTitle}${sent === "" ? "" : `, ${sent}`}. Open the chat.`}
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
