"use server";

import { z } from "zod";

import { revalidatePath } from "next/cache";

import { ATTACHMENT_KINDS } from "@/lib/chat/attachments";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import { AVATAR_REPLY } from "./avatar-copy";
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
  /**
   * The same objects as the two URLs above, by path rather than signed link.
   * The URLs are what the provider fetches and they expire; these are what the
   * thread keeps so the turn still shows its photo and clip on a later visit.
   */
  attachments: z
    .array(z.object({ kind: z.enum(ATTACHMENT_KINDS), path: z.string().min(1) }))
    .max(2)
    .optional(),
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to continue" };

  // Paths come from the client, so ownership is re-checked rather than assumed,
  // as it is in the upload actions and in `sendMessage`.
  if (parsed.data.attachments?.some((item) => !item.path.startsWith(`${user.id}/`))) {
    return { status: "error", message: "Those attachments could not be saved" };
  }

  const { attachments, ...rest } = parsed.data;

  /*
   * The paths are sent alongside the URLs, and the edge function prefers them.
   * It reads the objects from storage and uploads the bytes to the provider,
   * because a signed link to our own storage is unreachable from the
   * provider's network in development and expires after two hours in
   * production. The URLs stay for now so a caller that has only those still
   * works.
   */
  const body = {
    ...rest,
    imagePath: attachments?.find((item) => item.kind === "photo")?.path,
    audioPath: attachments?.find((item) => item.kind === "audio")?.path,
  };
  const { data, error } = await supabase.functions.invoke("generate-avatar", { body });

  if (error) {
    logger.warn("avatar generation could not start", { error: error.message });
    return { status: "error", message: "Could not start that avatar just now" };
  }

  const result = data as { generationId?: string; code?: string } | null;
  if (result?.code === "consent") return { status: "consent" };
  if (!result?.generationId) {
    return { status: "error", message: "The avatar service did not accept that" };
  }

  // The turn is persisted here because nothing else does it. An avatar render
  // went straight to the provider and never wrote a message, so a reload lost
  // the request, the reply and the attachments, leaving a finished video
  // sitting in a thread with nothing that explains where it came from.
  //
  // Deliberately after the render has been accepted: writing the turn first
  // would leave a message promising a video that was never started.
  const { error: turnError } = await supabase.rpc("append_turn", {
    p_project: parsed.data.projectId,
    p_user_content: parsed.data.prompt,
    p_assistant_content: AVATAR_REPLY,
    p_generation: result.generationId,
    p_attachments: attachments ?? [],
  });
  // The render is already under way and will be charged, so a failure to record
  // it must not read as a failure to start it. Logged, and the caller still
  // gets its generation id so the draft can be watched.
  if (turnError) logger.error("could not persist avatar turn", { error: turnError.message });

  revalidatePath(`/dashboard/c/${parsed.data.projectId}`);
  // The turn bumped the project's updated_at, which is what orders the sidebar
  // in the dashboard layout. A page-level revalidate does not reach it.
  revalidatePath("/dashboard", "layout");
  return { status: "ok", generationId: result.generationId };
}
