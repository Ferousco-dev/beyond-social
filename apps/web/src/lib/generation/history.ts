import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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

/**
 * The newest finished render for a project, or null when none is ready.
 *
 * Publishing needs something to publish. Without this the dialog cannot tell
 * "no video yet" from "video ready", and would offer to schedule nothing.
 */
export async function getLatestReadyGeneration(projectId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("video_generations")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as { id?: string } | null)?.id ?? null;
}
