import { z } from "zod";

/**
 * The shape the schedule page reads, and the one rule that governs it.
 *
 * The platform list is repeated here rather than imported from
 * `@/lib/social/platforms`, which is `server-only` because it carries OAuth
 * secrets. A label map is not a secret, and a client component needs it.
 */

export const PLATFORMS = ["tiktok", "instagram", "facebook", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const POST_STATUSES = ["scheduled", "publishing", "published", "failed"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

export interface ScheduledPost {
  readonly id: string;
  readonly platform: Platform;
  readonly caption: string;
  readonly hashtags: string;
  /** UTC instant. Never rendered raw: it goes through `describeSchedule`. */
  readonly scheduledFor: string;
  readonly status: PostStatus;
  /** Set once a platform has accepted the post. Its presence means we cannot take it back. */
  readonly externalId: string | null;
  /** Set immediately before the platform call, so it also means "may already be live". */
  readonly publishStartedAt: string | null;
  readonly error: string | null;
  /** The rendered video, when the generation still has one. */
  readonly videoUrl: string | null;
}

export const postRowSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  caption: z.string(),
  hashtags: z.string(),
  scheduled_for: z.string(),
  status: z.enum(POST_STATUSES),
  external_id: z.string().nullable(),
  publish_started_at: z.string().nullable(),
  error: z.string().nullable(),
  video_generations: z
    .object({
      result_url: z.string().nullable(),
      result_path: z.string().nullable().default(null),
    })
    .nullable(),
});

/**
 * Whether cancelling or rescheduling is still ours to do.
 *
 * `publishing` and `published` are excluded because at that point the platform
 * holds the post and nothing this app does can retract it. `external_id` is
 * checked as well as the status column: it is the platform's own receipt, and
 * 0028 already treats it as the authority over a status that a crashed worker
 * may have left stale.
 *
 * Shared by the server actions and the UI so they cannot disagree, but the
 * actions do not trust it coming from the client: they re-read the row.
 */
export function isMutable(post: {
  readonly status: PostStatus;
  readonly externalId: string | null;
}): boolean {
  return post.externalId === null && (post.status === "scheduled" || post.status === "failed");
}
