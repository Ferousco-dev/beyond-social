import "server-only";

import { logger } from "@/lib/logger";
import { serverEnv } from "@/lib/server-env";
import { createServiceClient } from "@/lib/supabase/service";

import { type ScrapePlatform } from "./types";

/**
 * Whether a post's thumbnail shows a person, cached per post across every
 * search term it turns up under. See migration 0132 for why this is its own
 * table rather than folded into `scrape_cache`.
 *
 * Every failure here is swallowed and logged, the same rule `cache.ts`
 * follows: a cache that cannot be reached must degrade to reclassifying,
 * never to a broken filter.
 */

function isConfigured(): boolean {
  return serverEnv.SUPABASE_SERVICE_ROLE_KEY !== "";
}

export interface PostKey {
  readonly platform: ScrapePlatform;
  readonly videoId: string;
}

/** Rows already known, keyed the same way the caller asked. */
export async function readClassifications(
  keys: readonly PostKey[],
): Promise<ReadonlyMap<string, boolean | null>> {
  const result = new Map<string, boolean | null>();
  if (!isConfigured() || keys.length === 0) return result;

  try {
    // One request per platform: `.in()` needs a single column, and video ids
    // are not unique across platforms.
    const byPlatform = new Map<ScrapePlatform, string[]>();
    for (const key of keys) {
      const list = byPlatform.get(key.platform) ?? [];
      list.push(key.videoId);
      byPlatform.set(key.platform, list);
    }

    const supabase = createServiceClient();
    for (const [platform, videoIds] of byPlatform) {
      const { data, error } = await supabase
        .from("post_classifications")
        .select("video_id, shows_person")
        .eq("platform", platform)
        .in("video_id", videoIds);

      if (error || !data) continue;
      for (const row of data as { video_id: string; shows_person: boolean | null }[]) {
        result.set(`${platform}:${row.video_id}`, row.shows_person);
      }
    }
  } catch (error) {
    logger.warn("classification cache read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

export async function writeClassification(
  key: PostKey,
  showsPerson: boolean | null,
): Promise<void> {
  if (!isConfigured()) return;

  try {
    await createServiceClient()
      .from("post_classifications")
      .upsert(
        {
          platform: key.platform,
          video_id: key.videoId,
          shows_person: showsPerson,
          classified_at: new Date().toISOString(),
        },
        { onConflict: "platform,video_id" },
      );
  } catch (error) {
    logger.warn("classification cache write failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
