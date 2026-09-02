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
};

/**
 * Whether a script would be accepted, asked before one is written.
 *
 * Both gates are environment the app server does not hold, so this asks the
 * function rather than reading a second copy of them: two places to configure
 * one thing is one place to forget.
 */
export async function twinVideoReadiness(): Promise<TwinVideoReadiness> {
  const unavailable = { ready: false, reason: UNAVAILABLE.provider_unconfigured! } as const;
  if (!isSupabaseConfigured) return unavailable;

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("generate-heygen-avatar", {
    body: { probe: true },
  });
  if (error) {
    logger.warn("could not read twin video readiness", { error: error.message });
    return unavailable;
  }

  const result = data as { ready?: boolean; reason?: string; cost?: number } | null;
  if (result?.ready === true && typeof result.cost === "number") {
    return { ready: true, cost: result.cost };
  }
  return {
    ready: false,
    reason: UNAVAILABLE[result?.reason ?? ""] ?? unavailable.reason,
  };
}

export type TwinVideoResult =
  { status: "ok"; generationId: string } | { status: "error"; message: string };

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

  // Created before the render, and only ever for a request that got this far,
  // so abandoning the form leaves no empty thread behind.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ user_id: user.id, title: titleFrom(parsed.data.script) })
    .select("id")
    .single();
  const projectId = (project as { id?: string } | null)?.id;
  if (projectError || !projectId) {
    logger.warn("could not open a project for a twin video", { error: projectError?.message });
    return { status: "error", message: "That video could not be started." };
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
    return { status: "error", message: reasonFor(detail) };
  }

  const generationId = (data as { generationId?: string } | null)?.generationId;
  if (!generationId) return { status: "error", message: "That video could not be started." };

  return { status: "ok", generationId };
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
  if (detail === "incomplete_avatar") {
    return "That avatar finished training without a voice, so it cannot speak yet.";
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
