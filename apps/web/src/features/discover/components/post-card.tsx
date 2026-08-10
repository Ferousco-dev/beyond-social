"use client";

import { Eye, Play, Sparkles } from "lucide-react";

import { tikTokEmbedUrl } from "@/lib/tiktok/url";
import { cn } from "@/lib/utils";

import { type DiscoverPost } from "../types";

/**
 * One post in the scroller.
 *
 * Shows its poster until it is the post being watched, then swaps in TikTok's
 * player. Only one card is ever active, so the page holds one iframe however far
 * the user scrolls: mounting a player per result would load a TikTok bundle for
 * every card in the feed.
 */

/** Views read as "1.2M", because the exact figure is noise at this size. */
function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(views);
}

export function PostCard({
  post,
  active,
  onActivate,
  onUse,
}: {
  post: DiscoverPost;
  active: boolean;
  onActivate: () => void;
  onUse: () => void;
}) {
  const embedUrl = tikTokEmbedUrl(post.videoId);

  return (
    // Stacked on small screens rather than hiding the side column: the caption
    // and the button that acts on the post are the point, not decoration.
    <article className="flex h-full snap-start flex-col items-center justify-center gap-4 py-4 lg:flex-row lg:gap-6">
      <div className="relative aspect-[9/16] max-h-[52vh] shrink-0 overflow-hidden rounded-2xl border border-hairline bg-black lg:h-full lg:max-h-[78vh]">
        {active && embedUrl ? (
          <iframe
            src={embedUrl}
            title={`TikTok post by @${post.handle}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            // The player is a third party: it gets no access to this document
            // and no ability to navigate the page it is embedded in.
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={onActivate}
            aria-label={`Play the post by @${post.handle}`}
            className="group size-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {post.thumbnailUrl ? (
              // Plain img: TikTok's CDN is not a configured image-optimiser host,
              // and these are short-lived URLs on a domain we do not control.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.thumbnailUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full bg-gradient-to-br from-neutral-800 to-neutral-950" />
            )}

            <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/10">
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-white/95 text-ink shadow-card">
                <Play className="size-6 translate-x-0.5 fill-current" aria-hidden />
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="flex w-full min-w-0 max-w-xs flex-col gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-ink">@{post.handle}</p>

          {post.viewCount !== null ? (
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Eye className="size-3.5" aria-hidden />
              <span className="tabular-nums">{formatViews(post.viewCount)}</span> views
            </p>
          ) : null}
        </div>

        {post.caption ? (
          <p className={cn("text-sm leading-relaxed text-ink-soft", "line-clamp-3 lg:line-clamp-6")}>
            {post.caption}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onUse}
          className="mt-1 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Sparkles className="size-4" aria-hidden />
          Use as inspiration
        </button>

        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Open on TikTok
        </a>
      </div>
    </article>
  );
}
