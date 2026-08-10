"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { isTrendCategory } from "@/lib/trends/categories";

/**
 * Records the industry a user says they create for.
 *
 * Checked against the taxonomy rather than stored as given: the value decides
 * which trends the feed shows, and an unknown id would filter it to nothing
 * with no way for the user to see why.
 */
const schema = z.object({
  industry: z.string().min(1).max(32).refine(isTrendCategory, "Not an industry we cover"),
});

export type IndustryResult = { ok: true } | { ok: false; message: string };

export async function saveIndustry(input: z.input<typeof schema>): Promise<IndustryResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Pick an industry from the list." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in again to change this." };

  const { error } = await supabase
    .from("profiles")
    .update({ industry: parsed.data.industry })
    .eq("id", user.id);

  if (error) {
    logger.warn("could not save industry", { error: error.message });
    return { ok: false, message: "Could not save that just now." };
  }

  // Both screens read it: the trends feed filters on it and the home screen
  // draws its inspiration from it.
  revalidatePath("/dashboard/trends");
  revalidatePath("/dashboard");
  return { ok: true };
}
