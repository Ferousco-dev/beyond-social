import "server-only";

import { logger } from "@/lib/logger";

import { runActor } from "./apify";
import { actorFor, isScrapeConfigured } from "./search";
import { type ScrapePlatform } from "./types";

/**
 * Fetching the actual video file for one known post, for the "deep" analysis
 * tier that watches it rather than reading numbers about it.
 *
 * A second scrape, not a field left over from the first: `search.ts` and
 * `url-actions.ts` both set `shouldDownloadVideos: false` on purpose, because
 * fetching every result's video file for a scroller nobody has asked "watch
 * this one" about yet would multiply Apify's bill by however many rows a
 * search returns. This asks for exactly one file, for exactly the one post a
 * user paid credits to have watched.
 */

function videoInputFor(platform: ScrapePlatform, url: string): Record<string, unknown> {
  if (platform === "tiktok") {
    return {
      postURLs: [url],
      shouldDownloadVideos: true,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
    };
  }
  // The Instagram actor's own output already carries `videoUrl` on a reel or
  // video item with no separate download flag to set.
  return { directUrls: [url], addParentData: false };
}

/** The first usable direct file URL, never the cover art. */
function pickVideoUrl(platform: ScrapePlatform, row: Record<string, unknown>): string | null {
  if (platform === "tiktok") {
    const mediaUrls = row["mediaUrls"];
    if (Array.isArray(mediaUrls) && typeof mediaUrls[0] === "string" && mediaUrls[0] !== "") {
      return mediaUrls[0];
    }
    const videoMeta = row["videoMeta"];
    const downloadAddr =
      videoMeta && typeof videoMeta === "object"
        ? (videoMeta as Record<string, unknown>)["downloadAddr"]
        : undefined;
    return typeof downloadAddr === "string" && downloadAddr !== "" ? downloadAddr : null;
  }

  const videoUrl = row["videoUrl"];
  return typeof videoUrl === "string" && videoUrl !== "" ? videoUrl : null;
}

/**
 * Comfortably under Gemini's inline-request ceiling once base64-encoded,
 * which inflates raw bytes by roughly a third, plus the prompt text riding
 * alongside it. A clip over this is skipped rather than truncated: a partial
 * video is worse evidence than the caption-only tier already has.
 */
const MAX_VIDEO_BYTES = 14 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

export interface FetchedVideo {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
}

export async function fetchPostVideo(
  platform: ScrapePlatform,
  url: string,
): Promise<FetchedVideo | null> {
  if (!isScrapeConfigured()) return null;

  let fileUrl: string | null = null;
  try {
    const rows = await runActor(actorFor(platform), videoInputFor(platform, url));
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const found = pickVideoUrl(platform, row as Record<string, unknown>);
      if (found !== null) {
        fileUrl = found;
        break;
      }
    }
  } catch (error) {
    logger.error("apify video scrape failed", {
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (fileUrl === null) {
    logger.warn("no downloadable video url in scraped row", { platform });
    return null;
  }

  try {
    const response = await fetch(fileUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (!response.ok || response.body === null) return null;

    // Failed fast against the declared length when the server reports one,
    // rather than downloading megabytes only to discard them.
    const declaredLength = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_VIDEO_BYTES) {
      logger.warn("scraped video too large for deep analysis", {
        platform,
        bytes: declaredLength,
      });
      return null;
    }

    const mimeType = response.headers.get("content-type") ?? "video/mp4";
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_VIDEO_BYTES) {
        logger.warn("scraped video exceeded the size cap mid-download", { platform });
        return null;
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { bytes, mimeType };
  } catch (error) {
    logger.error("video download failed", {
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
