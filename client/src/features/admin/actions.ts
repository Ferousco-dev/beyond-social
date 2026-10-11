"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
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

  // Not checked for zero rows matched the way the other admin write-backs are:
  // an admin picks this key from the list this page itself rendered, so a
  // stale key here would mean the row was deleted moments ago, not a foreign
  // or malicious one. The error is still worth a log line, an RLS denial or a
  // dropped connection currently vanishes with no signal anywhere that the
  // toggle a person just clicked did nothing.
  const { error } = await supabase
    .from("feature_flags")
    .update({
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq("key", parsed.data.key);
  if (error)
    logger.warn("could not update a feature flag", { key: parsed.data.key, error: error.message });

  revalidatePath("/dashboard/admin");
}
