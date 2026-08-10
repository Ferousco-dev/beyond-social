import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { isTrendDiscoveryConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";

import { parseTikTokPost } from "./tiktok-url";

/** Reads the current trend feed. */

const trendRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  source_url: z.string(),
  source_name: z.string(),
  prompt: z.string(),
  confidence: z.coerce.number(),
  discovered_at: z.string(),
  // Defaulted, so a build running against a database that has not taken the
  // migration yet reads the feed rather than failing the whole parse.
  video_url: z.string().nullable().default(null),
  author_handle: z.string().nullable().default(null),
  view_count: z.coerce.number().nullable().default(null),
});

export interface Trend {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly prompt: string;
  readonly confidence: number;
  readonly discoveredAt: string;
  /** The post this was observed on. Null when no single clip represents it. */
  readonly video: TrendVideo | null;
}

export interface TrendVideo {
  /** Validated at the boundary, so the feed never embeds an unparsed URL. */
  readonly videoId: string;
  readonly handle: string;
  readonly url: string;
  /** As reported by the source. Null when unreported, and never estimated. */
  readonly viewCount: number | null;
}

export interface TrendFeed {
  readonly trends: readonly Trend[];
  /** False when discovery has never been configured, which is a different
   * problem from having found nothing, and deserves a different message. */
  readonly configured: boolean;
}

/**
 * Re-parsed on the way out rather than trusted from the row.
 *
 * The URL was written by a discovery run reading pages we do not control, and it
 * is about to become an iframe source. A row that no longer parses loses its
 * video and keeps its brief, which is a degraded trend rather than a broken one.
 */
function toVideo(url: string | null, viewCount: number | null): TrendVideo | null {
  if (url === null) return null;

  const post = parseTikTokPost(url);
  return post ? { videoId: post.videoId, handle: post.handle, url: post.url, viewCount } : null;
}

export async function getTrends(category?: string): Promise<TrendFeed> {
  const configured = isTrendDiscoveryConfigured;
  if (!isSupabaseConfigured) return { trends: [], configured };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trends_current", {
    // The function treats undefined as "no filter"; the generated types spell
    // that as optional rather than nullable.
    p_category: category,
    p_limit: 24,
  });
  if (error) return { trends: [], configured };

  const parsed = z.array(trendRowSchema).safeParse(data);
  if (!parsed.success) return { trends: [], configured };

  return {
    configured,
    trends: parsed.data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      sourceUrl: row.source_url,
      sourceName: row.source_name,
      prompt: row.prompt,
      confidence: row.confidence,
      discoveredAt: row.discovered_at,
      video: toVideo(row.video_url, row.view_count),
    })),
  };
}
