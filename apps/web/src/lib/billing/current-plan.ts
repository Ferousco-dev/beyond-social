import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

/** The signed-in user's plan, defaulting to free when unknown. */
export async function getCurrentPlan(): Promise<string> {
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
}
