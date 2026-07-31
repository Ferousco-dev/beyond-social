"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { clientIp } from "@/lib/auth/request";
import { requireAdmin } from "@/lib/auth/require-admin";

import { writeDebugRpc } from "./rpc";
import { retryPostSchema } from "./schemas";
import type { RetryResult } from "./types";

const retryInputSchema = z.object({
  postId: z.string().uuid("That is not a post id."),
  reason: z.string().trim().max(200),
});

/**
 * The console's only write.
 *
 * It does not publish anything and cannot: `admin_retry_post` resets the row to
 * the state the scheduler scans for, so the attempt re-enters through
 * claim_due_posts and claim_post_for_publish exactly like the first one. The
 * external id is never touched, which is what keeps a retry from becoming a
 * second post on someone's public account.
 *
 * The audit row is written inside the same database transaction as the change,
 * so there is no ordering in which the requeue happened and the record of it
 * did not.
 */
export async function retryPostAction(
  _previous: RetryResult | null,
  formData: FormData,
): Promise<RetryResult> {
  // Second gate after the middleware, and the reason a forged post to this
  // action from a signed-in non-admin gets nothing.
  await requireAdmin();

  const parsed = retryInputSchema.safeParse({
    postId: formData.get("postId"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const result = await writeDebugRpc("admin_retry_post", {
    p_post: parsed.data.postId,
    p_reason: parsed.data.reason,
    p_ip: clientIp(await headers()),
  });

  // The database's own wording. "Post already reached the platform" is the
  // guard working, not a bug, and an operator needs to read it as written.
  if ("message" in result) return { status: "error", message: result.message };

  const row = retryPostSchema.safeParse(result.row);
  if (!row.success) {
    return { status: "error", message: "The retry ran but its result could not be read." };
  }

  revalidatePath("/debug");
  return { status: "ok", mayHavePosted: row.data.may_have_posted };
}
