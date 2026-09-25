"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { edgeFunctionErrorMessage } from "@/lib/supabase/function-error";

/**
 * Making a trained twin speak.
 *
 * A thin pass to the edge function, which is where the provider key and the
 * price gate live, plus the one thing the function cannot do for itself: a
 * generation belongs to a project, and somebody starting a video from the
 * Assets page has not opened a conversation to file it under. One is created
 * here so the render lands in the library and in a thread like every other
 * render, rather than in a shape only this feature knows how to read.
 */

/** Matches the edge function's own ceiling, so an over-long script is refused before the round trip. */
const MAX_SCRIPT = 1500;

const requestSchema = z.object({
  projectId: z.string().min(1).optional(),
  avatarId: z.string().uuid(),
  script: z.string().trim().min(1, "Write what you want to say.").max(MAX_SCRIPT),
});

export type TwinVideoRequest = z.infer<typeof requestSchema>;

/** Why the twin video path is unavailable, in words a person can act on. */
export type TwinVideoReadiness =
  | { readonly ready: true; readonly cost: number }
  | { readonly ready: false; readonly reason: string };

const UNAVAILABLE: Record<string, string> = {
  provider_unconfigured: "Video from your avatar is not switched on for this workspace yet.",
  unpriced: "Video from your avatar is not switched on yet: it has no credit price set.",
  /*
   * Distinct from the two reasons above on purpose. Those are real, durable
   * facts about this workspace; this one is "the check itself didn't finish,"
   * which used to be reported with the exact same wording as "nobody has
   * turned this on." A person cannot tell those apart, and only one of them
   * is something reloading the page fixes.
   */
  check_failed: "Couldn't check whether video is ready. Refresh the page to try again.",
};

/**
 * Whether a script would be accepted, asked before one is written.
 *
 * Both gates are environment the app server does not hold, so this asks the
 * function rather than reading a second copy of them: two places to configure
 * one thing is one place to forget.
 */
/**
 * HeyGen's function is called rarely enough to cold-start, which this once
 * assumed would never matter because the answer was always going to be "not
 * configured" anyway. Now that a real key and price exist, a cold start that
 * outran the old 2.5s budget reported the exact same "not switched on"
 * message a genuinely unconfigured workspace gets, which is indistinguishable
 * from broken. Widened past a realistic cold start, and the timeout path no
 * longer claims to know something it does not.
 */
const PROBE_TIMEOUT_MS = 8_000;

export async function twinVideoReadiness(): Promise<TwinVideoReadiness> {
  if (!isSupabaseConfigured) {
    return { ready: false, reason: UNAVAILABLE.provider_unconfigured! };
  }

  /*
   * Bounded, because this blocks the page that renders it: a hung call must
   * not take the whole library down with it. Distinct from a real refusal,
   * though — see `check_failed` above.
   */
  const supabase = await createClient();
  const probe = supabase.functions.invoke("generate-heygen-avatar", { body: { probe: true } });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), PROBE_TIMEOUT_MS));
  const settled = await Promise.race([probe, timeout]);

  if (settled === null) {
    logger.warn("twin video readiness probe timed out", { ms: PROBE_TIMEOUT_MS });
    return { ready: false, reason: UNAVAILABLE.check_failed! };
  }

  const { data, error } = settled;
  if (error) {
    logger.warn("could not read twin video readiness", { error: error.message });
    return { ready: false, reason: UNAVAILABLE.check_failed! };
  }

  const result = data as { ready?: boolean; reason?: string; cost?: number } | null;
  if (result?.ready === true && typeof result.cost === "number") {
    return { ready: true, cost: result.cost };
  }
  return {
    ready: false,
    reason: UNAVAILABLE[result?.reason ?? ""] ?? UNAVAILABLE.check_failed!,
  };
}

export type TwinVideoResult =
  { status: "ok"; generationId: string; projectId: string } | { status: "error"; message: string };

/** The thread title, taken from the opening of the script the way a chat title is. */
function titleFrom(script: string): string {
  const firstLine = script.split("\n")[0]!.trim();
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
}

export async function makeTwinVideo(request: TwinVideoRequest): Promise<TwinVideoResult> {
  if (!isSupabaseConfigured) return { status: "error", message: "This is not configured." };

  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "That is not a script." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to make this video." };

  let projectId = parsed.data.projectId;
  if (projectId) {
    const { data: existingProject, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (projectError || !existingProject) {
      return { status: "error", message: "That project could not be found." };
    }
  } else {
    // Created before the render, and only ever for a request that got this far,
    // so abandoning the form leaves no empty thread behind.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({ user_id: user.id, title: titleFrom(parsed.data.script) })
      .select("id")
      .single();
    projectId = (project as { id?: string } | null)?.id;
    if (projectError || !projectId) {
      logger.warn("could not open a project for a twin video", { error: projectError?.message });
      return { status: "error", message: "That video could not be started." };
    }
  }

  const { data, error } = await supabase.functions.invoke("generate-heygen-avatar", {
    body: {
      projectId,
      avatarId: parsed.data.avatarId,
      script: parsed.data.script,
      title: titleFrom(parsed.data.script),
    },
  });

  if (error) {
    // The function's own reason, which is the difference between "you are out
    // of credits" and a shrug.
    const detail = await edgeFunctionErrorMessage(error);
    logger.warn("could not start a twin video", { error: detail ?? error.message });
    // The project above exists only to give a render somewhere to file
    // under; a render that never started leaves it empty and permanent
    // otherwise, the one outcome nobody chose (a stray thread in their
    // history that goes nowhere, for a video they were refused, often for
    // something as ordinary as running out of credits).
    await supabase.from("projects").delete().eq("id", projectId);
    return { status: "error", message: reasonFor(detail) };
  }

  const generationId = (data as { generationId?: string } | null)?.generationId;
  if (!generationId) {
    await supabase.from("projects").delete().eq("id", projectId);
    return { status: "error", message: "That video could not be started." };
  }

  // Without a message row the thread has nothing to show: the render is real,
  // but the chat page reads `project_thread`, not `video_generations`, and a
  // project with no messages renders as an empty composer rather than the
  // generation in progress.
  const { error: turnError } = await supabase.rpc("append_turn", {
    p_project: projectId,
    p_user_content: parsed.data.script,
    p_assistant_content: "Your avatar is generating this video now.",
    p_generation: generationId,
  });
  if (turnError) {
    logger.warn("could not record a twin video turn", { error: turnError.message });
  }

  return { status: "ok", generationId, projectId };
}

/**
 * Refusals worth naming. Anything else is reported as a general failure rather
 * than as an identifier: the function's vocabulary is for logs, not for people.
 */
function reasonFor(detail: string | null): string {
  if (detail === null) return "That video could not be started.";
  if (detail in UNAVAILABLE) return UNAVAILABLE[detail]!;
  if (detail === "not_ready") return "That avatar is still training. It will be usable shortly.";
  if (detail === "no_avatar") return "That avatar could not be found.";
  if (detail === "voice_not_ready") {
    return "This avatar is trained, but it has no voice yet. Add your voice in Settings to finish it.";
  }
  if (detail === "incomplete_avatar") {
    return "That avatar finished training with a gap on HeyGen's side. Try recording it again.";
  }
  // A reservation refusal is already a sentence, which is what makes running
  // out of credits readable instead of a code.
  return /^[A-Z]/.test(detail) ? detail : "That video could not be started.";
}

export type TwinVideoState = "queued" | "generating" | "ready" | "failed" | "cancelled";

export interface TwinVideoStatus {
  readonly state: TwinVideoState;
  readonly error: string | null;
}

/** Where one render has got to. Read under the caller's own session, so it is theirs by construction. */
export async function twinVideoStatus(generationId: string): Promise<TwinVideoStatus | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("video_generations")
    .select("status, error")
    .eq("id", generationId)
    .maybeSingle();

  const row = data as { status: TwinVideoState; error: string | null } | null;
  return row ? { state: row.status, error: row.error } : null;
}
