"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { type GenerationStatus } from "@/lib/supabase/types";

export type StartResult =
  | { status: "ok"; generationId: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

// Kicks off a kie.ai video generation through the edge function. Returns
// "unconfigured" so callers can fall back to the local demo experience.
export async function startGeneration(input: {
  projectId: string;
  prompt: string;
  aspectRatio?: string;
}): Promise<StartResult> {
  const prompt = input.prompt.trim();
  if (!prompt) return { status: "error", message: "Prompt is required" };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("generate-video", {
    body: { projectId: input.projectId, prompt, aspectRatio: input.aspectRatio },
  });

  const generationId = (data as { generationId?: string } | null)?.generationId;
  if (error || !generationId) return { status: "error", message: "Could not start generation" };
  return { status: "ok", generationId };
}

export interface PollResult {
  status: GenerationStatus | "error";
  resultUrl: string | null;
}

// Syncs a generation's status from kie.ai and returns the current state.
export async function pollGeneration(generationId: string): Promise<PollResult> {
  if (!isSupabaseConfigured) return { status: "error", resultUrl: null };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("poll-generation", {
    body: { generationId },
  });

  if (error) return { status: "error", resultUrl: null };
  const result = data as { status?: GenerationStatus; resultUrl?: string | null } | null;
  return { status: result?.status ?? "error", resultUrl: result?.resultUrl ?? null };
}
