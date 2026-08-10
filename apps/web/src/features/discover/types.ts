/** One TikTok post as the scroller shows it. */
export interface DiscoverPost {
  readonly videoId: string;
  readonly handle: string;
  readonly url: string;
  readonly caption: string;
  /** As TikTok reported it. Null when unreported, and never estimated. */
  readonly viewCount: number | null;
  /** Poster frame, from the public oEmbed endpoint. Null when unavailable. */
  readonly thumbnailUrl: string | null;
}

export type DiscoverResult =
  | { status: "ok"; posts: readonly DiscoverPost[] }
  /** No search credentials, which is a different problem from finding nothing. */
  | { status: "unconfigured" }
  | { status: "error"; message: string };
