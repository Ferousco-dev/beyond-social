import "server-only";

import { type createClient } from "@/lib/supabase/server";

/**
 * The model this user chose for a family.
 *
 * The models page has let people pick a default since it was built, and the
 * generator never read it: the preference was written, displayed back, and
 * ignored, so the picker was decoration. It only became wireable once the
 * dispatch learned to route by model rather than always calling the veo
 * endpoint.
 *
 * Returns null when there is no preference, when the row points at a model that
 * has since been deactivated, or when the lookup fails. The caller falls back
 * to its own default, which is what should happen: a stale preference must not
 * stop somebody making a video.
 */
export async function preferredModel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  family: "video" | "avatar",
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_model_preferences")
    .select("model_id, model_catalog!inner(is_active, family)")
    .eq("user_id", userId)
    .eq("family", family)
    .maybeSingle();

  if (error !== null || data === null) return null;

  // The join is inner and filtered, so a row that survives it is a live model
  // in the right family. Checked rather than assumed, because deactivating a
  // model must not leave somebody pinned to something the dispatch will refuse.
  const model = data.model_catalog as unknown as { is_active?: boolean } | null;
  return model?.is_active ? data.model_id : null;
}
