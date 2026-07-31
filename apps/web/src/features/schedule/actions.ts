"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isValidTimeZone } from "@/lib/time/zone";

import { toInstant } from "./lib/instant";
import { isMutable, POST_STATUSES, type PostStatus } from "./lib/types";

/**
 * Changing a post that has not gone out yet.
 *
 * The rule enforced here, not in the UI: once a post is publishing or
 * published, the platform has it and we do not, so neither cancelling nor
 * rescheduling is ours to do. Hiding the buttons is presentation. This is the
 * check that holds when someone calls the action directly.
 */

export type ScheduleActionResult = { status: "ok" } | { status: "error"; message: string };

const idSchema = z.string().uuid();

const rescheduleSchema = z.object({
  id: idSchema,
  /** Local wall clock, `YYYY-MM-DDTHH:mm`, as `<input type="datetime-local">` gives it. */
  scheduledLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time"),
  timeZone: z.string().refine(isValidTimeZone, "Unknown timezone"),
});

const currentRowSchema = z.object({
  status: z.enum(POST_STATUSES),
  external_id: z.string().nullable(),
});

const GONE = "That post is already with the platform, so it can no longer be changed here.";

/**
 * Re-reads the row and refuses if the platform already has it.
 *
 * Read first so the user gets a sentence rather than a silent no-op, and the
 * write that follows repeats the same predicate so a worker that claims the row
 * in between loses the race instead of being overwritten.
 */
async function loadMutable(
  id: string,
): Promise<{ ok: true } | { ok: false; result: ScheduleActionResult }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("status, external_id")
    .eq("id", id)
    .maybeSingle();

  if (error !== null)
    return { ok: false, result: { status: "error", message: "Could not load that post" } };
  if (data === null) {
    return { ok: false, result: { status: "error", message: "That post no longer exists" } };
  }

  const parsed = currentRowSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, result: { status: "error", message: "Could not read that post" } };
  }
  if (!isMutable({ status: parsed.data.status, externalId: parsed.data.external_id })) {
    return { ok: false, result: { status: "error", message: GONE } };
  }
  return { ok: true };
}

/** The statuses a write may still touch, repeated on the write itself. */
const MUTABLE_STATUSES: readonly PostStatus[] = ["scheduled", "failed"];

export async function cancelScheduledPost(rawId: string): Promise<ScheduleActionResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };

  const id = idSchema.safeParse(rawId);
  if (!id.success) return { status: "error", message: "Unknown post" };

  const guard = await loadMutable(id.data);
  if (!guard.ok) return guard.result;

  const supabase = await createClient();
  // Cancelling removes the row: `post_status` has no cancelled state, and a
  // post nobody will publish is not a record worth keeping. That is why the
  // caller confirms first.
  const { data, error } = await supabase
    .from("scheduled_posts")
    .delete()
    .eq("id", id.data)
    .in("status", MUTABLE_STATUSES)
    .is("external_id", null)
    .select("id");

  if (error !== null) {
    logger.warn("could not cancel scheduled post", { error: error.message });
    return { status: "error", message: "Could not cancel that just now" };
  }
  if (data.length === 0) return { status: "error", message: GONE };

  revalidatePath("/dashboard/schedule");
  return { status: "ok" };
}

export async function reschedulePost(
  input: z.input<typeof rescheduleSchema>,
): Promise<ScheduleActionResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "Not connected yet" };

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const instant = toInstant(parsed.data.scheduledLocal, parsed.data.timeZone);
  if (!instant) return { status: "error", message: "That date and time could not be read" };
  // A minute of slack, so a time chosen and submitted on the same minute is not
  // rejected for being a few seconds old.
  if (instant.getTime() < Date.now() - 60_000) {
    return { status: "error", message: "That time is in the past" };
  }

  const guard = await loadMutable(parsed.data.id);
  if (!guard.ok) return guard.result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .update({
      scheduled_for: instant.toISOString(),
      status: "scheduled",
      // A retried post starts clean: the old failure no longer describes it, and
      // leaving `publish_started_at` set would make the next worker treat it as
      // an attempt that had already begun.
      error: null,
      publish_started_at: null,
    })
    .eq("id", parsed.data.id)
    .in("status", MUTABLE_STATUSES)
    .is("external_id", null)
    .select("id");

  if (error !== null) {
    logger.warn("could not reschedule post", { error: error.message });
    return { status: "error", message: "Could not reschedule that just now" };
  }
  if (data.length === 0) return { status: "error", message: GONE };

  revalidatePath("/dashboard/schedule");
  return { status: "ok" };
}
