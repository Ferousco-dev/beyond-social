"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { toActionResult, type ActionResult } from "./result";

const creditsSchema = z.object({
  userId: z.string().uuid(),
  total: z.number().int().min(0),
  used: z.number().int().min(0),
  reason: z.string().min(1, "A reason is required"),
});

/** Sets an account's credit allowance and consumption. The RPC requires a reason. */
export async function setUserCredits(input: z.input<typeof creditsSchema>): Promise<ActionResult> {
  const parsed = creditsSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_credits", {
    p_user: parsed.data.userId,
    p_total: parsed.data.total,
    p_used: parsed.data.used,
    p_reason: parsed.data.reason,
  });

  if (!error) {
    revalidatePath(`/dashboard/admin/users/${parsed.data.userId}`);
  }
  return toActionResult(error);
}

const planSchema = z.object({
  userId: z.string().uuid(),
  plan: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/, "Not a valid plan id"),
  total: z.number().int().min(0),
  reason: z.string().min(1, "A reason is required"),
});

/** Overrides an account's plan and credit allowance. Does not touch Stripe. */
export async function setUserPlan(input: z.input<typeof planSchema>): Promise<ActionResult> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_plan", {
    p_user: parsed.data.userId,
    p_plan: parsed.data.plan,
    p_total: parsed.data.total,
    p_reason: parsed.data.reason,
  });

  if (!error) {
    revalidatePath(`/dashboard/admin/users/${parsed.data.userId}`);
  }
  return toActionResult(error);
}

const suspensionSchema = z.object({
  userId: z.string().uuid(),
  suspended: z.boolean(),
  reason: z.string().min(1, "A reason is required"),
});

/**
 * Suspends or restores an account. The database refuses to suspend an admin,
 * including the caller's own account, and surfaces that as an error here.
 */
export async function setUserSuspension(
  input: z.input<typeof suspensionSchema>,
): Promise<ActionResult> {
  const parsed = suspensionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_suspension", {
    p_user: parsed.data.userId,
    p_suspended: parsed.data.suspended,
    p_reason: parsed.data.reason,
  });

  if (!error) {
    revalidatePath(`/dashboard/admin/users/${parsed.data.userId}`);
    revalidatePath("/dashboard/admin/users");
  }
  return toActionResult(error);
}
