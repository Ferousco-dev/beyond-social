"use client";

import { Loader2, Play } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { type LibraryItem } from "@/lib/go-api/schemas";

import { loadVideos } from "../video-page-actions";

function Card({ item }: { item: LibraryItem }): ReactNode {
  const body = (
    <>
      {/* A picture, never the video: nothing is downloaded to draw this. */}
      <span className="relative block aspect-[9/16] max-h-64 w-full bg-ink">
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-paper/60">
            <Play className="size-8" aria-hidden />
          </span>
        )}
      </span>
      <span className="block truncate px-3 py-2.5 text-sm font-medium text-ink">{item.prompt || "Untitled video"}</span>
    </>
  );
  const frame = "overflow-hidden rounded-lg border border-hairline bg-paper";
  // A video opens its editor project. One whose project is not known yet is
  // shown but not linked, so nothing leads to a page that does not exist.
  return item.project_id ? (
    <li className={`${frame} transition-colors hover:border-primary/40`}>
      <Link href={`/editor/${item.project_id}` as Route} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {body}
      </Link>
    </li>
  ) : (
    <li className={frame}>{body}</li>
  );
}

/** Created videos, fifteen at a time, the rest on request. */
export function CreatedVideoGrid({
  initial,
  hasMore: initialHasMore,
}: {
  initial: readonly LibraryItem[];
  hasMore: boolean;
}): ReactNode {
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function more(): Promise<void> {
    setLoading(true);
    setError(null);
    const page = await loadVideos(items.length);
    setLoading(false);
    if (!page.ok) {
      setError(page.message);
      return;
    }
    setItems((current) => [...current, ...page.items]);
    setHasMore(page.hasMore);
  }

  if (items.length === 0) {
    return <p className="mt-6 border-y border-hairline py-6 text-sm text-ink-soft">Your created videos will appear here.</p>;
  }
  return (
    <>
      <ul aria-label="Created videos" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </ul>
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void more()}
            disabled={loading}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-hairline px-5 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            View more
          </button>
        </div>
      ) : null}
    </>
  );
}
