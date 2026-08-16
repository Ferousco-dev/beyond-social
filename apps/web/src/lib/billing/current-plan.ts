import "server-only";

import { cache } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

/**
 * The signed-in user's plan, defaulting to free when unknown.
 *
 * Memoised per request, the same way the session is. Several parts of one
 * render ask this question now that the sidebar shows the plan and the
 * integration surfaces gate on it, and they are the same question, so they
 * should be one query rather than one each. `cache` scopes that to a single
 * request, so it cannot carry a plan between users the way a module-level
 * variable would.
 */
export const getCurrentPlan = cache(async (): Promise<string> => {
  if (!isSupabaseConfigured) return "free";

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return "free";

  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle<{ plan: string }>();
  return data?.plan ?? "free";
});
