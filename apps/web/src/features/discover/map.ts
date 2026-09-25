import "server-only";

import { type ScrapedPost } from "@/lib/social-scrape/types";

import { type DiscoverPost } from "./types";

/** A scraped post, in the shape the scroller reads, with a poster fallback. */
export function toDiscoverPost(
  post: ScrapedPost,
  posters: ReadonlyMap<string, { thumbnailUrl: string | null }>,
): DiscoverPost {
  return {
    platform: post.platform,
    videoId: post.videoId,
    handle: post.handle,
    url: post.url,
    caption: post.description,
    viewCount: post.viewCount,
    thumbnailUrl: post.thumbnailUrl ?? posters.get(post.url)?.thumbnailUrl ?? null,
    showsPerson: post.showsPerson,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    shareCount: post.shareCount,
    durationSeconds: post.durationSeconds,
    hashtags: post.hashtags,
    transcript: post.transcript,
  };
}
