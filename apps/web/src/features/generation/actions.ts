"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { type GenerationStatus } from "@/lib/supabase/types";

const ASPECT_RATIOS = ["16:9", "9:16", "Auto"] as const;

const startInputSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().trim().min(1, "Prompt is required").max(2000),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
});

const pollInputSchema = z.object({ generationId: z.string().min(1) });

export type StartInput = z.input<typeof startInputSchema>;

export type StartResult =
  | { status: "ok"; generationId: string }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

// Kicks off a kie.ai video generation through the edge function. Returns
// "unconfigured" so callers can fall back to the local demo experience.
export async function startGeneration(input: StartInput): Promise<StartResult> {
  const parsed = startInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const { projectId, prompt, aspectRatio } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("generate-video", {
    body: { projectId, prompt, aspectRatio },
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
  const parsed = pollInputSchema.safeParse({ generationId });
  if (!parsed.success || !isSupabaseConfigured) return { status: "error", resultUrl: null };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("poll-generation", {
    body: { generationId: parsed.data.generationId },
  });

  if (error) return { status: "error", resultUrl: null };
  const result = data as { status?: GenerationStatus; resultUrl?: string | null } | null;
  return { status: result?.status ?? "error", resultUrl: result?.resultUrl ?? null };
}
