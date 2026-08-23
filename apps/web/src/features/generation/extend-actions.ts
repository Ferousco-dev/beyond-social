"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { isUpgradeReason } from "@/lib/credits/types";
import { checkVideoRun } from "@/lib/generation/gate";
import { edgeFunctionErrorMessage } from "@/lib/supabase/function-error";
import { createClient } from "@/lib/supabase/server";

/**
 * Continuing a finished clip.
 *
 * Separate from `startGeneration` because it is a different request to a
 * different endpoint: the provider continues a task it already ran rather than
 * making something new, so there is no model choice, no aspect ratio and no
 * reference image to resolve. What it shares is the cost, which is why the same
 * gate runs first.
 */

const extendSchema = z.object({
  generationId: z.string().min(1),
  /**
   * How the continuation should go. Optional: absent, the clip's own prompt is
   * reused, which is the sensible reading of "continue this" and saves asking
   * someone to restate what they already described.
   */
  prompt: z.string().trim().max(2000).optional(),
});

export type ExtendResult =
  | { status: "ok"; generationId: string }
  | { status: "unconfigured" }
  /** The plan, the balance, or the clip itself refused. Nothing was spent. */
  | { status: "denied"; message: string; upgrade: boolean }
  | { status: "error"; message: string };

export async function extendGeneration(input: z.input<typeof extendSchema>): Promise<ExtendResult> {
  const parsed = extendSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const gate = await checkVideoRun();
  if (!gate.allowed)
    return { status: "denied", message: gate.notice, upgrade: isUpgradeReason(gate.reason) };

  const supabase = await createClient();

  /*
   * The clip's own prompt stands in when the caller did not write one. Read
   * through the user's client, so a generation belonging to somebody else is
   * simply not found rather than being refused by a check written here.
   */
  let prompt = parsed.data.prompt;
  if (prompt === undefined || prompt === "") {
    const { data } = await supabase
      .from("video_generations")
      .select("prompt")
      .eq("id", parsed.data.generationId)
      .maybeSingle();
    const source = (data as { prompt?: string } | null)?.prompt?.trim();
    if (!source) return { status: "error", message: "That video could not be found" };
    prompt = source;
  }

  const { data, error } = await supabase.functions.invoke("extend-video", {
    body: { generationId: parsed.data.generationId, prompt },
  });

  const generationId = (data as { generationId?: string } | null)?.generationId;
  if (error || !generationId) {
    /*
     * The edge function refuses for reasons the user can act on: the clip is
     * still rendering, it was made by a model that cannot continue, or it was
     * rendered above 720p. Those arrive as a message worth showing rather than
     * a generic failure.
     */
    const detail = error ? await edgeFunctionErrorMessage(error) : null;
    return { status: "denied", message: detail ?? "Could not continue that video", upgrade: false };
  }

  revalidatePath("/dashboard");
  return { status: "ok", generationId };
}
