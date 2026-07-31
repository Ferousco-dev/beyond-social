import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { postRowSchema, type ScheduledPost } from "./types";

/**
 * The user's scheduled posts, grouped the way the page reads them.
 *
 * RLS scopes `scheduled_posts` to its owner, so there is no user id to pass and
 * no way to ask for someone else's. Rows that fail validation are dropped
 * rather than faked: a half-parsed post is worse than a missing one.
 */

export interface ScheduleBoard {
  /** Not yet on a platform: `scheduled` and `publishing`, soonest first. */
  readonly upcoming: readonly ScheduledPost[];
  /** Newest first, because the useful question is what went out last. */
  readonly published: readonly ScheduledPost[];
  readonly failed: readonly ScheduledPost[];
}

const EMPTY: ScheduleBoard = { upcoming: [], published: [], failed: [] };

const SELECT =
  "id, platform, caption, hashtags, scheduled_for, status, external_id, publish_started_at, error, video_generations(result_url)";

export async function getScheduleBoard(limit = 200): Promise<ScheduleBoard> {
  if (!isSupabaseConfigured) return EMPTY;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select(SELECT)
    .order("scheduled_for", { ascending: false })
    .limit(limit);
  if (error !== null || data === null) return EMPTY;

  const posts: ScheduledPost[] = [];
  for (const row of data) {
    const parsed = postRowSchema.safeParse(row);
    if (!parsed.success) continue;
    posts.push({
      id: parsed.data.id,
      platform: parsed.data.platform,
      caption: parsed.data.caption,
      hashtags: parsed.data.hashtags,
      scheduledFor: parsed.data.scheduled_for,
      status: parsed.data.status,
      externalId: parsed.data.external_id,
      publishStartedAt: parsed.data.publish_started_at,
      error: parsed.data.error,
      videoUrl: parsed.data.video_generations?.result_url ?? null,
    });
  }

  return {
    upcoming: posts
      .filter((post) => post.status === "scheduled" || post.status === "publishing")
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)),
    published: posts.filter((post) => post.status === "published"),
    failed: posts.filter((post) => post.status === "failed"),
  };
}
