"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { toActionResult, type ActionResult } from "./result";

const setModelCreditCostSchema = z.object({
  modelId: z.string().min(1),
  creditCost: z.number().int().min(0),
  reason: z.string().min(1, "A reason is required"),
});

/** Sets one model's credit cost. The database validates and audits the change. */
export async function setModelCreditCost(
  input: z.input<typeof setModelCreditCostSchema>,
): Promise<ActionResult> {
  const parsed = setModelCreditCostSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_model_credit_cost", {
    p_model_id: parsed.data.modelId,
    p_credit_cost: parsed.data.creditCost,
    p_reason: parsed.data.reason,
  });

  if (!error) revalidatePath("/dashboard/admin/model-pricing");
  return toActionResult(error);
}
