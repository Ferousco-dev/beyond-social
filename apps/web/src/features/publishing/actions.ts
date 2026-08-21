"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { currentTrace, withActionTrace } from "@/lib/observability/trace";
import { listConnections } from "@/lib/social/connections";
import { isPlatformConfigured } from "@/lib/social/platforms";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/time/zone";

/**
 * Scheduling a video for publishing.
 *
 * This is the write the publish dialog never had. The dialog collected captions
 * and times and its button did nothing, so the whole publishing pipeline behind
 * it, the scheduler, the queue and the worker, had no way to ever receive work.
 *
 * The time arrives as a local wall clock plus a zone and is converted to an
 * instant here. Nothing downstream sees a local time: the row holds
 * `timestamptz`, and the worker compares against `now()`.
 */

const PLATFORMS = ["tiktok", "instagram", "facebook", "youtube"] as const;

const scheduleSchema = z.object({
  generationId: z.string().uuid(),
  /**
   * Supplied by the client so a resubmission lands on the same row. A double
   * click, a retried form, or a lost response with a completed write all produce
   * the same request, and without this each one schedules another post.
   */
  idempotencyKey: z.string().min(8).max(120),
  timeZone: z.string().refine(isValidTimeZone, "Unknown timezone"),
  posts: z
    .array(
      z.object({
        platform: z.enum(PLATFORMS),
        caption: z.string().trim().min(1, "A caption is required").max(2200),
        hashtags: z.string().trim().max(500).default(""),
        /** Local wall clock, `YYYY-MM-DDTHH:mm`, as an `<input type=datetime-local>` gives it. */
        scheduledLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time"),
      }),
    )
    .min(1)
    .max(PLATFORMS.length)
    // Two posts naming the same platform share the same idempotency key and
    // the upsert below silently drops the second, which would have reported
    // scheduling one more post than actually landed.
    .refine(
      (posts) => new Set(posts.map((post) => post.platform)).size === posts.length,
      "Each platform can only be scheduled once per request",
    ),
});

export type ScheduleResult =
  { status: "ok"; scheduled: number } | { status: "error"; message: string };

/**
 * Converts a local wall clock in a named zone to the instant it refers to.
 *
 * Done by asking the formatter what that instant looks like in the zone and
 * correcting by the difference, because there is no built-in inverse. Two passes
 * because the offset itself depends on the date, which is the whole reason an
 * offset cannot be stored instead of a zone.
 */
function toInstant(local: string, timeZone: string): Date | null {
  const asUtc = new Date(`${local}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return null;

  const offsetAt = (date: Date): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
    const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "0";
    const shifted = Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")) % 24,
      Number(get("minute")),
      Number(get("second")),
    );
    return shifted - date.getTime();
  };

  const firstGuess = new Date(asUtc.getTime() - offsetAt(asUtc));
  return new Date(asUtc.getTime() - offsetAt(firstGuess));
}

export async function schedulePosts(
  input: z.input<typeof scheduleSchema>,
): Promise<ScheduleResult> {
  return withActionTrace("schedulePosts", () => schedule(input));
}

async function schedule(input: z.input<typeof scheduleSchema>): Promise<ScheduleResult> {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { generationId, idempotencyKey, timeZone, posts } = parsed.data;

  // Refused here rather than accepted and failed later by the worker. A post
  // scheduled to a platform we cannot authenticate to would sit in the queue
  // until it failed, which tells the user nothing at the moment they could act.
  const unavailable = posts.filter((post) => !isPlatformConfigured(post.platform));
  if (unavailable.length > 0) {
    return {
      status: "error",
      message: `Not connected yet: ${unavailable.map((post) => post.platform).join(", ")}`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to continue" };

  /*
   * The app having credentials for a platform is not the same fact as this
   * account having authorised it. `isPlatformConfigured` above only answers
   * the first, so scheduling to a platform the app supports but this person
   * has never connected, or disconnected since, passed straight through and
   * only failed hours or days later when the worker actually tried to
   * publish, which is exactly the silent-until-it-fails outcome this
   * function's own check above exists to avoid for the other case.
   */
  const connections = await listConnections();
  const connected = new Set(
    connections
      .filter((connection) => connection.connected)
      .map((connection) => connection.platform),
  );
  const disconnected = posts.filter((post) => !connected.has(post.platform));
  if (disconnected.length > 0) {
    return {
      status: "error",
      message: `Connect your account first: ${disconnected.map((post) => post.platform).join(", ")}`,
    };
  }

  // The generation has to be finished and theirs. RLS would refuse another
  // user's row anyway; this turns that into a sentence rather than a silent
  // empty result.
  const { data: generation } = await supabase
    .from("video_generations")
    .select("id, status")
    .eq("id", generationId)
    .maybeSingle();
  if (!generation) return { status: "error", message: "That video no longer exists" };
  if (generation.status !== "ready") {
    return { status: "error", message: "That video is still rendering" };
  }

  const traceId = currentTrace()?.traceId ?? null;
  const rows = [];
  for (const post of posts) {
    const instant = toInstant(post.scheduledLocal, timeZone);
    if (!instant) return { status: "error", message: "That date and time could not be read" };
    if (instant.getTime() < Date.now() - 60_000) {
      return { status: "error", message: "That time is in the past" };
    }
    rows.push({
      user_id: user.id,
      generation_id: generationId,
      platform: post.platform,
      caption: post.caption,
      hashtags: post.hashtags,
      scheduled_for: instant.toISOString(),
      status: "scheduled" as const,
      // One key per platform, so scheduling four platforms is four rows and a
      // resubmission still collapses onto the same four.
      idempotency_key: `${idempotencyKey}:${post.platform}`,
      trace_id: traceId,
    });
  }

  const { error } = await supabase
    .from("scheduled_posts")
    .upsert(rows as never, { onConflict: "user_id,idempotency_key", ignoreDuplicates: true });

  if (error) {
    logger.error("could not schedule posts", { error: error.message });
    return { status: "error", message: "Could not schedule that just now" };
  }

  logger.info("posts scheduled", { count: rows.length, generationId });
  revalidatePath("/dashboard/overview");
  return { status: "ok", scheduled: rows.length };
}
