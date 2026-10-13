import { parseTikTokPost } from "../tiktok/url.ts";
import type { ScrapePlatform } from "./types.ts";

/**
 * Recognising a pasted post link, so Discover can scrape the exact video
 * someone brings rather than only what a keyword search turns up.
 *
 * This file only recognises addresses. A share-sheet link (`vm.tiktok.com`,
 * `instagram.com/share/...`) is passed on as it is, and the API follows it on
 * the server, restricted to TikTok and Instagram over https. Nothing in the
 * browser makes a request to an address a stranger chose.
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

/**
 * The addresses a phone's share sheet produces. Their final destination is only
 * known by following them, which the server does safely.
 */
export function parseShortLink(input: string): ParsedSocialUrl | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  const clean = `${url.origin}${path}`;

  if ((host === "vm.tiktok.com" || host === "vt.tiktok.com") && path.replace(/\//g, "") !== "") {
    return { platform: "tiktok", url: clean };
  }
  if ((host === "tiktok.com" || host === "www.tiktok.com") && path.startsWith("/t/")) {
    return { platform: "tiktok", url: clean };
  }
  if (host === "instagr.am" && path.replace(/\//g, "") !== "") {
    return { platform: "instagram", url: clean };
  }
  if ((host === "instagram.com" || host === "www.instagram.com") && path.startsWith("/share/")) {
    return { platform: "instagram", url: clean };
  }
  return null;
}

const YOUTUBE_ID = /^[\w-]{11}$/;

/** A YouTube video, Shorts or youtu.be link. The chat can watch these; Discover cannot search them. */
export function isYouTubeLink(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "") return false;
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") return YOUTUBE_ID.test(url.pathname.slice(1));
  if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") return YOUTUBE_ID.test(url.searchParams.get("v") ?? "");
    if (url.pathname.startsWith("/shorts/")) return YOUTUBE_ID.test(url.pathname.slice("/shorts/".length));
  }
  return false;
}

/**
 * The first link in a message that the chat can watch (TikTok, Instagram or
 * YouTube, short links included), so the box can say so before it is sent.
 */
export function findWatchableLink(text: string): string | null {
  for (const match of text.matchAll(/https:\/\/[^\s<>"')\]]+/g)) {
    const candidate = match[0].replace(/[.,;:!?]+$/, "");
    if (parseSocialUrl(candidate) ?? parseShortLink(candidate) ?? (isYouTubeLink(candidate) ? candidate : null)) {
      return candidate;
    }
  }
  return null;
}

/** True for anything that at least looks like a URL, short links included,
 * so the caller can tell "not a link" from "a link we cannot use". */
export function looksLikeUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim());
}
