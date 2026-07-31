"use server";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { checkVideoRun } from "@/lib/generation/gate";
import { enhancePrompt } from "@/lib/prompt-engine/enhance";
import { recordChunkOutcome } from "@/lib/prompt-engine/feedback";
import { learnFromPrompt } from "@/lib/prompt-engine/learn";
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
  | { status: "ok"; generationId: string; sourceChunks: string[] }
  | { status: "unconfigured" }
  /** The plan or the balance refused the run. Nothing was sent to the provider. */
  | { status: "denied"; message: string }
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

  // Tier and balance first, before any work is done or any money is spent.
  const gate = await checkVideoRun();
  if (!gate.allowed) return { status: "denied", message: gate.notice };

  // Ground the prompt in the knowledge base when the engine is configured; falls
  // back to the raw prompt otherwise, so the engine improves output but is never
  // a point of failure. The chunks that shaped it ride along for attribution.
  const enhanced = await enhancePrompt({ prompt });
  const finalPrompt = enhanced?.text ?? prompt;

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("generate-video", {
    body: { projectId, prompt: finalPrompt, aspectRatio, sourceChunks: enhanced?.chunkIds ?? [] },
  });

  const generationId = (data as { generationId?: string } | null)?.generationId;
  if (error || !generationId) return { status: "error", message: "Could not start generation" };

  // Best-effort: let the system learn from the original prompt in the background.
  void learnFromPrompt(prompt, enhanced?.text);

  return { status: "ok", generationId, sourceChunks: enhanced?.chunkIds ?? [] };
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

const outcomeSchema = z.object({
  chunkIds: z.array(z.string()).max(50),
  outcome: z.enum(["accepted", "rejected", "edited", "regenerated"]),
  editDistance: z.number().min(0).max(1).nullable().default(null),
});

/**
 * Records what the user did with a generation, attributing the outcome to the
 * knowledge chunks that produced it. This is the closed learning loop from the
 * UI: accepting an output strengthens the chunks behind it, rejecting weakens
 * them. Safe to call unconditionally; no-ops when the engine is unconfigured.
 */
export async function recordGenerationOutcome(input: z.input<typeof outcomeSchema>): Promise<void> {
  const parsed = outcomeSchema.safeParse(input);
  if (!parsed.success) return;
  await recordChunkOutcome(parsed.data.chunkIds, parsed.data.outcome, parsed.data.editDistance);
}
