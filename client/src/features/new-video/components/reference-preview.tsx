"use client";

import { ExternalLink, Sparkles } from "lucide-react";

import { instagramEmbedUrl } from "@/lib/instagram/url";
import { tikTokEmbedUrl } from "@/lib/tiktok/url";

import { PostPlayer } from "@/features/discover/components/post-player";
import { TransformPanel } from "@/features/transform/components/transform-panel";
import { type DiscoverPost } from "@/features/discover/types";
import { PLATFORM_NAME, formatViews } from "@/features/discover/lib/platforms";

export function ReferencePreview({
  post,
  onAnalyze,
}: {
  post: DiscoverPost;
  onAnalyze: (url: string) => void;
}) {
  const platformName = PLATFORM_NAME[post.platform];
  const embedUrl = post.platform === "instagram"
    ? instagramEmbedUrl(post.videoId)
    : tikTokEmbedUrl(post.videoId);

  return (
    <div className="flex flex-col gap-3">
      <div className="mx-auto w-full max-w-[calc(45vh*9/16)] overflow-hidden rounded-lg border border-hairline bg-black lg:max-w-none">
        <PostPlayer
          key={post.videoId}
          embedUrl={embedUrl}
          title={`${platformName} post by @${post.handle}`}
          posterUrl={post.thumbnailUrl}
          videoUrl={post.playbackUrl}
          platformName={platformName}
          postUrl={post.url}
        />
      </div>
      <p className="text-xs text-ink-soft">
        {post.discoveryVideoId
          ? "Analyze creates a summary and fresh script. To send this original clip for restyling, use Transform below."
          : "Analyze creates a summary and fresh script; it does not generate or transform the source clip."}
      </p>
      <button
        type="button"
        onClick={() => onAnalyze(post.url)}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Sparkles className="size-4" aria-hidden />
        Analyze video
      </button>
      {post.viewCount !== null ? <p className="text-xs text-ink-soft">{formatViews(post.viewCount)} views</p> : null}
      <a href={post.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-soft underline underline-offset-2 hover:text-ink">
        Open on {platformName}
        <ExternalLink className="size-3" aria-hidden />
      </a>
      {post.discoveryVideoId ? <TransformPanel videoId={post.discoveryVideoId} /> : null}
    </div>
  );
}