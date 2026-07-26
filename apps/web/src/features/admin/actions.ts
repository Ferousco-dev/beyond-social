"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const toggleSchema = z.object({ key: z.string().min(1), enabled: z.boolean() });

/**
 * Toggles a feature flag. Authorisation is the RLS policy on `feature_flags`,
 * not a check here: the database refuses a non-admin write regardless of what
 * this action does, which is the property worth relying on.
 */
export async function setFeatureFlag(input: z.input<typeof toggleSchema>): Promise<void> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success || !isSupabaseConfigured) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("feature_flags")
    .update({
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq("key", parsed.data.key);

  revalidatePath("/dashboard/admin");
}
