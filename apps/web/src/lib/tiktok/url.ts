/**
 * Reading TikTok post URLs.
 *
 * Discovery collects these from pages we do not control, and they end up in an
 * iframe `src`. So a URL is parsed into its parts and rebuilt from them rather
 * than passed through: anything that is not recognisably a TikTok post is
 * rejected, and what reaches the embed is a string this module composed.
 */

/** Post ids are numeric and long. Bounded so a huge string cannot be smuggled. */
const VIDEO_ID = /^\d{6,32}$/;

/** Handles without the leading `@`, which TikTok limits to 24 characters. */
const HANDLE = /^[A-Za-z0-9._]{1,24}$/;

export interface TikTokPost {
  readonly videoId: string;
  readonly handle: string;
  /** Rebuilt from the parts above, never the string that came in. */
  readonly url: string;
}

/**
 * Parses a canonical post URL: `tiktok.com/@handle/video/1234567890`.
 *
 * Short links (`vm.tiktok.com/...`) are rejected rather than followed. Resolving
 * one means a request to whatever it points at, which is exactly the thing an
 * untrusted URL should not be allowed to make us do.
 */
export function parseTikTokPost(input: string): TikTokPost | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  if (host !== "www.tiktok.com" && host !== "tiktok.com" && host !== "m.tiktok.com") return null;

  // `/@handle/video/<id>`, and nothing else. Query and fragment are dropped:
  // they carry tracking, not identity.
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[1] !== "video") return null;

  const handle = (segments[0] ?? "").replace(/^@/, "");
  const videoId = segments[2] ?? "";
  if (!HANDLE.test(handle) || !VIDEO_ID.test(videoId)) return null;

  return { videoId, handle, url: `https://www.tiktok.com/@${handle}/video/${videoId}` };
}

/**
 * TikTok's own embed player for a post.
 *
 * Built from a parsed id rather than taking a URL, so there is no path from a
 * scraped string to this without going through validation first.
 */
export function tikTokEmbedUrl(videoId: string): string | null {
  return VIDEO_ID.test(videoId) ? `https://www.tiktok.com/embed/v2/${videoId}` : null;
}

/** Every canonical post URL found in a page of text, deduplicated, in order. */
export function extractTikTokPosts(text: string): readonly TikTokPost[] {
  const found = new Map<string, TikTokPost>();

  for (const match of text.matchAll(/https:\/\/[\w.]*tiktok\.com\/@[\w.]+\/video\/\d+/g)) {
    const post = parseTikTokPost(match[0]);
    if (post && !found.has(post.videoId)) found.set(post.videoId, post);
  }

  return [...found.values()];
}
