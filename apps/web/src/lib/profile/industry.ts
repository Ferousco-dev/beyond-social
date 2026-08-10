import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import { isTrendCategory } from "@/lib/trends/categories";

/**
 * The industry this user makes videos for.
 *
 * Null covers three cases that all mean the same thing to a caller: never
 * asked, skipped, or stored under an id the taxonomy no longer knows. Each one
 * should produce unfiltered suggestions rather than an empty screen, so they are
 * deliberately not distinguished.
 */
export async function getIndustry(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("industry")
    .eq("id", user.id)
    .maybeSingle();

  const industry = data?.industry;
  // Checked against the live taxonomy rather than returned as stored. An id that
  // has been retired would otherwise filter every feed down to nothing, which
  // looks like a broken product rather than a stale preference.
  return typeof industry === "string" && isTrendCategory(industry) ? industry : null;
}
