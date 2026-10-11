import { type TrendCategory } from "../categories";

/**
 * Where trends come from.
 *
 * There are two ways to learn what is working on TikTok and they are not
 * interchangeable in quality. TikTok's own API is authoritative and reports real
 * numbers; reading the open web is a reconstruction, and the numbers it can
 * offer are whatever somebody wrote in a paragraph. The product should prefer
 * the first and fall back to the second, and neither the discovery run nor the
 * feed should have to know which one answered.
 *
 * So a source is anything that can turn a niche into trends. `available` is the
 * gate: a source with no credentials reports itself unavailable rather than
 * failing at the first call, which lets selection be a plain filter.
 */

export interface DiscoveredTrend {
  readonly title: string;
  readonly description: string;
  /** A complete brief, specific enough to render unedited. */
  readonly prompt: string;
  /** 0..1, how strongly the source supports this being current. */
  readonly confidence: number;
  readonly category: string;
  /** The post this was observed on, when a single one represents it. */
  readonly videoUrl: string | null;
  readonly authorHandle: string | null;
  /** Only when the source actually reported it. Never estimated. */
  readonly viewCount: number | null;
  readonly sourceUrl: string;
  readonly sourceName: string;
}

export interface TrendSource {
  /** Recorded on the run, so a thin feed can be traced to which source answered. */
  readonly id: string;
  /** False when the source has no credentials, which is not an error. */
  readonly available: boolean;
  discover(category: TrendCategory): Promise<readonly DiscoveredTrend[]>;
}
