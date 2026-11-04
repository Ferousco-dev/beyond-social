import Link from "next/link";
import { type ReactNode } from "react";

import { type LibraryItem } from "@/lib/go-api/schemas";

export function CreatedVideoGrid({ items }: { items: readonly LibraryItem[] }): ReactNode {
  if (items.length === 0) {
    return <p className="mt-6 border-y border-hairline py-6 text-sm text-ink-soft">Your created videos will appear here.</p>;
  }
  return (
        <ul aria-label="Created videos" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-lg border border-hairline bg-paper transition-colors hover:border-primary/40">
              <Link href={`/dashboard/library#video-${item.id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <video
                  src={item.video_url}
                  poster={item.thumbnail_url}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden
                  tabIndex={-1}
                  className="aspect-[9/16] max-h-64 w-full bg-ink object-cover"
                />
                <span className="block truncate px-3 py-2.5 text-sm font-medium text-ink">{item.prompt || "Untitled video"}</span>
              </Link>
            </li>
          ))}
        </ul>
  );
}