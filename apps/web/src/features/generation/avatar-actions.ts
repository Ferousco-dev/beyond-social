"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { CONSENT_VERSION } from "./consent";

/**
 * Talking avatars: a photo of a person plus an audio track, rendered as that
 * person speaking it.
 *
 * The provider lip-syncs an audio file that is supplied, rather than speaking
 * text in a cloned voice. So the flow is "record or upload yourself saying it",
 * not "type it and hear yourself". Saying it in a cloned voice would need a
 * separate text-to-speech step before this one.
 */

const startSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().trim().min(1, "Describe what should happen").max(2000),
  imageUrl: z.string().url(),
  audioUrl: z.string().url(),
});

export type AvatarResult =
  | { status: "ok"; generationId: string }
  | { status: "unconfigured" }
  /** Consent has not been recorded, so the UI should ask for it. */
  | { status: "consent" }
  | { status: "error"; message: string };

/** Records that the caller attested the likeness is theirs. Append only. */
export async function recordLikenessConsent(): Promise<{ status: "ok" } | { status: "error" }> {
  if (!isSupabaseConfigured) return { status: "error" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error" };

  const { error } = await supabase
    .from("likeness_consents")
    .insert({ user_id: user.id, statement_version: CONSENT_VERSION });

  if (error) {
    logger.error("could not record likeness consent", { error: error.message });
    return { status: "error" };
  }
  return { status: "ok" };
}

/** Whether the caller has accepted the current wording. */
export async function hasLikenessConsent(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("likeness_consents")
    .select("id")
    .eq("statement_version", CONSENT_VERSION)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

/**
 * Starts an avatar render.
 *
 * Consent is checked again inside the edge function, which is the check that
 * counts: this one exists so the UI can ask for it before spending the round
 * trip, not because the client is trusted.
 */
export async function startAvatarGeneration(
  input: z.input<typeof startSchema>,
): Promise<AvatarResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  if (!(await hasLikenessConsent())) return { status: "consent" };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("generate-avatar", {
    body: parsed.data,
  });

  if (error) {
    logger.warn("avatar generation could not start", { error: error.message });
    return { status: "error", message: "Could not start that avatar just now" };
  }

  const result = data as { generationId?: string; code?: string } | null;
  if (result?.code === "consent") return { status: "consent" };
  if (!result?.generationId) {
    return { status: "error", message: "The avatar service did not accept that" };
  }
  return { status: "ok", generationId: result.generationId };
}
