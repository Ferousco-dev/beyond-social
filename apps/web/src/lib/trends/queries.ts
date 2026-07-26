import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { isTrendDiscoveryConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";

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
}

export interface TrendFeed {
  readonly trends: readonly Trend[];
  /** False when discovery has never been configured, which is a different
   * problem from having found nothing, and deserves a different message. */
  readonly configured: boolean;
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
    })),
  };
}
