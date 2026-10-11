"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { edgeFunctionErrorMessage } from "@/lib/supabase/function-error";

/** Mirrors the `clone_status` check constraint added in migration 0111. */
export type CloneStatus = "none" | "pending" | "ready" | "failed";

export type CloneResult =
  | { status: "ok"; cloneStatus: CloneStatus }
  | { status: "failed"; message: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/**
 * Starts cloning the caller's enrolled clip with HeyGen, following
 * `startTwinTraining`'s pattern: invoke the edge function, translate its
 * response, and let the caller re-render around whatever state comes back.
 * Costed, so the UI gates this behind a confirm dialog before calling it.
 */
export async function startVoiceClone(): Promise<CloneResult> {
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again" };

  const { data, error } = await supabase.functions.invoke("clone-voice", { body: {} });
  if (error) {
    const detail = await edgeFunctionErrorMessage(error);
    logger.warn("could not start voice clone", { error: error.message, detail });
    return { status: "error", message: detail ?? "Could not start cloning that voice" };
  }

  const result = data as { status?: string; error?: string } | null;
  if (result?.status !== "pending") {
    if (result?.error === "clone_failed") {
      return { status: "failed", message: "The voice provider could not clone that recording" };
    }
    return {
      status: "error",
      message:
        result?.error === "unpriced" || result?.error === "provider_unconfigured"
          ? "Voice cloning is not available yet"
          : (result?.error ?? "Could not start cloning that voice"),
    };
  }

  revalidatePath("/dashboard/settings/account");
  return { status: "ok", cloneStatus: "pending" };
}
