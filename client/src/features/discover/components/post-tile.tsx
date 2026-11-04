"use client";

import { Eye, Play } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatViews } from "../lib/platforms";
import { type DiscoverPost } from "../types";

/**
 * One result in the grid.
 *
 * A poster and two facts. The caption is deliberately not here: it is the
 * longest thing a post carries and the least useful for deciding which to open,
 * and forty of them side by side is a wall of text rather than a set of videos.
 * It reads in the detail pane, where there is room for it.
 *
 * The whole tile is the button. A play affordance that is smaller than the
 * thumbnail invites a miss on a touch screen, and there is nothing else in a
 * tile to click.
 */
export function PostTile({
  post,
  selected,
  onSelect,
}: {
  post: DiscoverPost;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        aria-label={`Open the post by @${post.handle}`}
        className="group w-full cursor-pointer text-left focus-visible:outline-none"
      >
        <div
          className={cn(
            "relative aspect-[9/16] overflow-hidden rounded-lg border bg-cloud transition-colors",
            // The selection is on the border rather than a scale or a glow: it
            // has to survive being one of forty, and a ring is legible at that
            // density where a shadow is not.
            selected ? "border-primary" : "border-hairline group-hover:border-ink-soft/40",
            "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary",
          )}
        >
          {post.thumbnailUrl ? (
            // Plain img: these are third-party CDNs that are not configured
            // image-optimiser hosts, on URLs we do not control.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-br from-neutral-800 to-neutral-950" />
          )}

          {/* Only on hover and focus. A permanent play badge on every tile is
              forty identical icons competing with the thumbnails they sit on. */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100 group-focus-visible:bg-black/20 group-focus-visible:opacity-100">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/95 text-neutral-900">
              <Play className="size-4 translate-x-px fill-current" aria-hidden />
            </span>
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-medium text-ink">@{post.handle}</p>
          {post.viewCount !== null ? (
            <p className="flex shrink-0 items-center gap-1 text-xs text-ink-soft">
              <Eye className="size-3" aria-hidden />
              <span className="tabular-nums">{formatViews(post.viewCount)}</span>
            </p>
          ) : null}
        </div>
      </button>
    </li>
  );
}
