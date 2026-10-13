import "server-only";

import { goApi } from "@/lib/go-api/client";
import { discoveryResponse, videosResponse, type GoVideo } from "@/lib/go-api/schemas";

import { type DiscoverPost } from "./types";

/**
 * Running a discovery on the Go API and waiting for it.
 *
 * The API answers at once and does the scrape in the background. A server
 * action cannot hold a socket for the browser, so this polls briefly and hands
 * back the finished list, which is what the scroller already expects.
 */

const POLL_INTERVAL_MS = 2_000;
const MAX_WAIT_MS = 150_000;
/** The API's own cap on videos per discovery. */
export const DISCOVERY_LIMIT = 60;

export type DiscoveryOutcome =
  | { readonly status: "ok"; readonly posts: readonly DiscoverPost[] }
  | { readonly status: "failed"; readonly message: string; readonly code?: string };

type Request = { readonly platform: string; readonly query: string } | { readonly url: string };

export async function runDiscovery(request: Request): Promise<DiscoveryOutcome> {
  const created = await goApi("/api/v1/discover", discoveryResponse, {
    method: "POST",
    body: "url" in request ? { url: request.url } : { ...request, limit: DISCOVERY_LIMIT },
  });
  if (!created.ok) return { status: "failed", message: created.message, code: created.code };

  const id = created.data.data.id;
  const deadline = Date.now() + MAX_WAIT_MS;
  for (;;) {
    const current = await goApi(`/api/v1/discover/${id}`, discoveryResponse);
    if (!current.ok) return { status: "failed", message: current.message };
    const { status, error } = current.data.data;
    if (status === "failed") return { status: "failed", message: error ?? "The search failed." };
    if (status === "completed") break;
    if (Date.now() > deadline) return { status: "failed", message: "The search took too long." };
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  const videos = await goApi(`/api/v1/discover/${id}/videos?limit=${DISCOVERY_LIMIT}`, videosResponse);
  if (!videos.ok) return { status: "failed", message: videos.message };
  return { status: "ok", posts: videos.data.data.map(toPost) };
}

function toPost(video: GoVideo): DiscoverPost {
  return {
    platform: video.platform,
    videoId: video.source_video_id,
    handle: video.creator_handle ?? "",
    url: video.url,
    caption: video.caption ?? "",
    viewCount: video.view_count ?? null,
    thumbnailUrl: video.thumbnail_url ?? null,
    showsPerson: null,
    likeCount: video.like_count ?? null,
    commentCount: video.comment_count ?? null,
    shareCount: video.share_count ?? null,
    durationSeconds: video.duration_seconds ?? null,
    hashtags: video.hashtags,
    transcript: null,
    discoveryVideoId: video.id,
  };
}
