"use client";

import { ExternalLink, Sparkles } from "lucide-react";

import { instagramEmbedUrl } from "@/lib/instagram/url";
import { tikTokEmbedUrl } from "@/lib/tiktok/url";

import { PLATFORM_NAME, formatViews } from "../lib/platforms";
import { type DiscoverPost } from "../types";
import { Spinner } from "@/components/ui/spinner";

/**
 * The post being studied.
 *
 * One player, mounted here and nowhere else. The feed used to mount and unmount
 * a player as cards scrolled past, so scrolling away from a video and back
 * rebuilt its iframe and started it over. Scrolling the grid no longer touches
 * this, so that cannot happen: only choosing a different post swaps the player.
 *
 * Deliberately does not repeat what the embed already shows. The player carries
 * the handle, the caption and the like count in the platform's own chrome, and
 * printing all of it again beside the frame was the duplication that made this
 * screen look padded. What is here is what the embed does not say: how it did,
 * and what to do with it.
 */
export function PostDetail({
  post,
  analysing,
  onUse,
}: {
  post: DiscoverPost;
  analysing: boolean;
  onUse: () => void;
}) {
  const name = PLATFORM_NAME[post.platform];
  const embedUrl =
    post.platform === "instagram" ? instagramEmbedUrl(post.videoId) : tikTokEmbedUrl(post.videoId);

  const stats = [
    post.viewCount !== null ? { label: "Views", value: formatViews(post.viewCount) } : null,
    post.likeCount !== null ? { label: "Likes", value: formatViews(post.likeCount) } : null,
    post.commentCount !== null
      ? { label: "Comments", value: formatViews(post.commentCount) }
      : null,
  ].flatMap((stat) => (stat ? [stat] : []));

  return (
    <div className="flex flex-col gap-4">
      {/*
        Height-capped on a phone rather than filling the width.
        
        A 9:16 player across a 375px viewport is about 660px tall, which is the
        whole screen: the results it is meant to sit beside were pushed entirely
        below the fold, so the page opened on one video and no sign that a grid
        existed. Capping the height keeps a row of results in view. From `lg` it
        has its own column and the cap comes off.
      */}
      <div className="mx-auto w-full max-w-[calc(45vh*9/16)] overflow-hidden rounded-lg border border-hairline bg-black lg:max-w-none">
        {embedUrl ? (
          <iframe
            // Keyed on the post so switching swaps the frame rather than
            // navigating a live one, which leaves the previous video's audio
            // playing under the new poster.
            key={post.videoId}
            src={embedUrl}
            title={`${name} post by @${post.handle}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            // The player is a third party: it gets no access to this document
            // and no ability to navigate the page it is embedded in.
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-[9/16] w-full border-0"
          />
        ) : (
          <div className="flex aspect-[9/16] w-full items-center justify-center px-6 text-center">
            <p className="text-xs text-ink-soft">
              This one cannot be played here. Open it on {name} instead.
            </p>
          </div>
        )}
      </div>

      {stats.length > 0 ? (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-paper px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
                {stat.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onUse}
          disabled={analysing}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {analysing ? (
            <Spinner className="size-3.5" />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
          {analysing ? "Reading this post" : "Use as inspiration"}
        </button>

        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-hairline px-4 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Open on {name}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}
