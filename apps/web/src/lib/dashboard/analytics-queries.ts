import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { emptyDays, type Funnel, type ProductAnalytics } from "./analytics";

/**
 * Reads the product analytics the overview renders.
 *
 * Every number is derived from our own tables. Platform view counts are absent
 * on purpose: they need insights APIs we have not integrated, and a dashboard
 * that invents them is worse than one that admits the gap.
 */

const DEFAULT_DAYS = 7;

const dailyRowSchema = z.object({
  day: z.string(),
  generated: z.coerce.number(),
  ready: z.coerce.number(),
});

const platformRowSchema = z.object({
  platform: z.string(),
  published: z.coerce.number(),
});

const funnelRowSchema = z.object({
  generated: z.coerce.number(),
  ready: z.coerce.number(),
  published: z.coerce.number(),
});

const EMPTY_FUNNEL: Funnel = { generated: 0, ready: 0, published: 0 };

function empty(days: number): ProductAnalytics {
  return { daily: emptyDays(days), platforms: [], funnel: EMPTY_FUNNEL, hasData: false };
}

/**
 * Everything the overview needs. Returns an empty shape rather than throwing
 * when Supabase is unconfigured or the caller is signed out, so the page
 * renders an honest empty state instead of an error.
 */
export async function getProductAnalytics(days = DEFAULT_DAYS): Promise<ProductAnalytics> {
  if (!isSupabaseConfigured) return empty(days);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty(days);

  const since = new Date(Date.now() - days * 24 * 3600_000).toISOString();
  const [dailyResult, platformResult, funnelResult] = await Promise.all([
    supabase.rpc("product_activity_daily", { p_user: user.id, p_days: days }),
    supabase.rpc("product_platform_totals", { p_user: user.id }),
    supabase.rpc("product_funnel", { p_user: user.id, p_since: since }),
  ]);

  const daily = z.array(dailyRowSchema).safeParse(dailyResult.data);
  const platforms = z.array(platformRowSchema).safeParse(platformResult.data);
  const funnelRows = Array.isArray(funnelResult.data) ? funnelResult.data : [funnelResult.data];
  const funnel = funnelRowSchema.safeParse(funnelRows[0]);

  return {
    daily: daily.success
      ? daily.data.map(({ day, generated, ready }) => ({ date: day, generated, ready }))
      : emptyDays(days),
    platforms: platforms.success ? platforms.data : [],
    funnel: funnel.success ? funnel.data : EMPTY_FUNNEL,
    hasData: funnel.success && funnel.data.generated > 0,
  };
}
