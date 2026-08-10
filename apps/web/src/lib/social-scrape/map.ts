import { parseTikTokPost } from "@/lib/tiktok/url";

import { type ScrapedPost, type ScrapePlatform } from "./types";

/**
 * Turning an actor's rows into posts.
 *
 * Written to read several plausible names for each field rather than one. Apify
 * actors are third-party code: two TikTok scrapers call the view count
 * `playCount` and `views`, the same actor has renamed fields between versions,
 * and a mapper pinned to one spelling silently returns nothing the day that
 * changes. Reading a handful of aliases costs nothing and fails far less often.
 *
 * A row that yields no usable URL is dropped rather than patched. Everything
 * downstream embeds these, so a post whose identity cannot be established is
 * worth less than no post at all.
 */

/** The first of these keys that holds a usable value of the right kind. */
function pick(row: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    // Dotted keys, because actors nest: `authorMeta.name`, `videoMeta.duration`.
    const value = key.split(".").reduce<unknown>((current, part) => {
      if (current === null || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[part];
    }, row);

    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Hashtags arrive as plain strings or as objects with a name on them. */
function asHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.replace(/^#/, "");
      if (entry && typeof entry === "object") {
        const name = (entry as Record<string, unknown>).name;
        if (typeof name === "string") return name.replace(/^#/, "");
      }
      return "";
    })
    .filter((tag) => tag !== "")
    .slice(0, 30);
}

const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** Instagram ids are shortcodes rather than digits, so this is its own check. */
function instagramUrl(row: Record<string, unknown>): { url: string; id: string } | null {
  const direct = asText(pick(row, ["url", "postUrl", "displayUrl"]));
  const shortcode = asText(pick(row, ["shortCode", "shortcode", "code", "id"]));

  if (/^https:\/\/(www\.)?instagram\.com\/(p|reel|reels)\/[\w-]+/i.test(direct)) {
    const id = direct.split("/").filter(Boolean).pop() ?? shortcode;
    return { url: direct.split("?")[0] ?? direct, id: id || shortcode };
  }
  if (/^[\w-]{5,20}$/.test(shortcode)) {
    return { url: `https://www.instagram.com/reel/${shortcode}/`, id: shortcode };
  }
  return null;
}

export function mapScrapedPost(platform: ScrapePlatform, raw: unknown): ScrapedPost | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const handleRaw = asText(
    pick(row, [
      "authorMeta.name",
      "authorMeta.uniqueId",
      "author.uniqueId",
      "ownerUsername",
      "username",
      "author",
    ]),
  ).replace(/^@/, "");
  const handle = HANDLE.test(handleRaw) ? handleRaw : "";

  const description = asText(pick(row, ["text", "caption", "description", "title", "desc"])).slice(
    0,
    2000,
  );

  const common = {
    handle,
    description,
    viewCount: asNumber(pick(row, ["playCount", "views", "viewCount", "videoPlayCount"])),
    likeCount: asNumber(pick(row, ["diggCount", "likes", "likesCount", "likeCount"])),
    commentCount: asNumber(pick(row, ["commentCount", "comments", "commentsCount"])),
    shareCount: asNumber(pick(row, ["shareCount", "shares"])),
    durationSeconds: asNumber(pick(row, ["videoMeta.duration", "duration", "videoDuration"])),
    hashtags: asHashtags(pick(row, ["hashtags", "tags"])),
    // Scrapers do not transcribe. Left null rather than faked from the caption,
    // because an analysis weights a transcript as evidence of what was said.
    transcript: null,
    thumbnailUrl:
      asText(
        pick(row, ["videoMeta.coverUrl", "covers.default", "cover", "thumbnailUrl", "displayUrl"]),
      ) || null,
  };

  if (platform === "tiktok") {
    // Re-parsed through the same validator every other TikTok URL goes through,
    // so a scraped string cannot reach an iframe unchecked.
    const url = asText(pick(row, ["webVideoUrl", "postPage", "url", "shareUrl"]));
    const post = parseTikTokPost(url);
    if (!post) return null;

    return {
      ...common,
      platform,
      videoId: post.videoId,
      url: post.url,
      handle: common.handle || post.handle,
    };
  }

  const instagram = instagramUrl(row);
  if (!instagram || common.handle === "") return null;

  return { ...common, platform, videoId: instagram.id, url: instagram.url };
}
