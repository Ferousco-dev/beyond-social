import { parseTikTokPost } from "@/lib/tiktok/url";

import { type ScrapePlatform } from "./types";

/**
 * Recognising a pasted post link, so Discover can scrape the exact video
 * someone brings rather than only what a keyword search turns up.
 *
 * Canonical URLs only, same discipline `parseTikTokPost` already applies: a
 * short link (`vm.tiktok.com`, `instagr.am`) is rejected rather than
 * resolved, because resolving one means making a request to whatever it
 * points at, which is exactly what an untrusted string should not get to
 * decide. Whoever pastes a short link is told to paste the real one; nothing
 * here follows a redirect on their behalf.
 */

export interface ParsedSocialUrl {
  readonly platform: ScrapePlatform;
  readonly url: string;
}

/** `/p/`, `/reel/` and `/reels/` all identify a single post. */
const INSTAGRAM_POST = /^https:\/\/(?:www\.)?instagram\.com\/(p|reel|reels)\/([\w-]+)/i;

export function parseSocialUrl(input: string): ParsedSocialUrl | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const tiktok = parseTikTokPost(trimmed);
  if (tiktok) return { platform: "tiktok", url: tiktok.url };

  const instagram = INSTAGRAM_POST.exec(trimmed);
  if (instagram) {
    const kind = instagram[1] === "reels" ? "reel" : instagram[1];
    return { platform: "instagram", url: `https://www.instagram.com/${kind}/${instagram[2]}/` };
  }

  return null;
}

/** True for anything that at least looks like a URL, short links included,
 * so the caller can tell "not a link" from "a link we cannot use". */
export function looksLikeUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim());
}
