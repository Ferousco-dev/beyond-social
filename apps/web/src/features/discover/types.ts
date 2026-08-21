import { type ScrapePlatform } from "@/lib/social-scrape/types";

/** One post as the scroller shows it, from whichever platform it came from. */
export interface DiscoverPost {
  /**
   * Which platform this came from. Carried per post rather than held once for
   * the feed, because the card needs it to embed the right player and to name
   * the link out.
   */
  readonly platform: ScrapePlatform;
  readonly videoId: string;
  readonly handle: string;
  readonly url: string;
  readonly caption: string;
  /** As the platform reported it. Null when unreported, and never estimated. */
  readonly viewCount: number | null;
  /** Poster frame, from the scrape or the public oEmbed endpoint. Null when unavailable. */
  readonly thumbnailUrl: string | null;

  /*
   * The rest of what the Research API reported, carried so a post can be
   * analysed without searching for it again. All nullable: the API returns what
   * the granted scope allows and omits the rest.
   */
  readonly likeCount: number | null;
  readonly commentCount: number | null;
  readonly shareCount: number | null;
  readonly durationSeconds: number | null;
  readonly hashtags: readonly string[];
  /** TikTok's own transcription of the speech, when it gave us one. */
  readonly transcript: string | null;
}

export type DiscoverResult =
  | { status: "ok"; posts: readonly DiscoverPost[] }
  /** No search credentials, which is a different problem from finding nothing. */
  | { status: "unconfigured" }
  | { status: "error"; message: string };
