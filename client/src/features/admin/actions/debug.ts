"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { toActionResult, type ActionResult } from "./result";

const retrySchema = z.object({
  postId: z.string().uuid(),
  reason: z.string().default(""),
});

/**
 * Re-queues a stuck or failed post for publish. Never clears `external_id`, so
 * a post the platform already accepted stays refused by claim_post_for_publish.
 */
export async function retryPost(input: z.input<typeof retrySchema>): Promise<ActionResult> {
  const parsed = retrySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_retry_post", {
    p_post: parsed.data.postId,
    p_reason: parsed.data.reason,
  });

  if (!error) {
    revalidatePath("/dashboard/admin/debug");
    revalidatePath("/dashboard/admin/health");
  }
  return toActionResult(error);
}
