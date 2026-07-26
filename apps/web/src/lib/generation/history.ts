import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * The directed prompt behind the most recent video in a project.
 *
 * Refinement edits this rather than the user's phrasing, because the stored
 * prompt is the full direction (subject, camera, lighting) while the message is
 * only the delta.
 */
export async function getLatestDirectedPrompt(
  supabase: SupabaseClient,
  projectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("video_generations")
    .select("prompt, status")
    .eq("project_id", projectId)
    // A failed render still tells us what was asked for, so it is a valid base
    // for "try that again but slower".
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as { prompt?: string } | null;
  const prompt = row?.prompt?.trim();
  return prompt ? prompt : null;
}
