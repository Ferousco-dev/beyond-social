"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { REGENERATE_REPLY } from "./regenerate-copy";
import { isSupabaseConfigured } from "@/lib/env";
import { checkVideoRun } from "@/lib/generation/gate";
import { enhancePrompt } from "@/lib/prompt-engine/enhance";
import { recordChunkOutcome } from "@/lib/prompt-engine/feedback";
import { learnFromPrompt } from "@/lib/prompt-engine/learn";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
  // `after` rather than a floating promise: this runs once the response is on
  // its way, and on serverless a floating one can be torn down before it does.
  after(() => learnFromPrompt(prompt, enhanced?.text));

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

/**
 * Stops waiting for a render.
 *
 * The provider has no cancel endpoint, so this cannot stop the work: the render
 * finishes either way. It settles the row so the draft leaves the thread and
 * the client stops polling, and the RPC writes the charge, because credits are
 * debited on completion and a cancelled render would otherwise be free.
 */
export async function cancelGeneration(generationId: string): Promise<void> {
  const parsed = pollInputSchema.safeParse({ generationId });
  if (!parsed.success || !isSupabaseConfigured) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Settling this writes a credit debit, which refreshes the owner's credit
  // cache, and the profile guard rejects that under the account holder's own
  // identity. The session is resolved above, so the id passed here is verified
  // rather than client-supplied.
  const { error } = await createServiceClient().rpc("cancel_generation", {
    p_generation_id: parsed.data.generationId,
    p_user_id: user.id,
  });
  if (error) logger.warn("could not cancel generation", { error: error.message });
}

const regenerateSchema = z.object({ generationId: z.string().min(1) });

export type RegenerateResult =
  | { status: "ok"; generationId: string }
  | { status: "unconfigured" }
  /** The plan or the balance refused the run. Nothing was sent to the provider. */
  | { status: "denied"; message: string }
  | { status: "error"; message: string };

/**
 * Runs the same brief again.
 *
 * The prompt is read back from the row rather than taken from the caller, so a
 * regenerate is the same request a second time and cannot be turned into a free
 * way to submit arbitrary prompts against an existing generation's id.
 *
 * It produces a new draft rather than replacing the old one. A render is paid
 * for whether or not it is better than the last, and overwriting the previous
 * result would throw away something the user has already been charged for.
 */
export async function regenerateGeneration(
  input: z.input<typeof regenerateSchema>,
): Promise<RegenerateResult> {
  const parsed = regenerateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Invalid input" };
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to continue" };

  // RLS scopes this to the caller's own rows, so a generation id that belongs to
  // someone else reads as one that does not exist.
  const { data, error } = await supabase
    .from("video_generations")
    .select("project_id, prompt, aspect_ratio")
    .eq("id", parsed.data.generationId)
    .maybeSingle();
  if (error !== null || data === null) {
    return { status: "error", message: "That draft could not be found" };
  }

  const gate = await checkVideoRun();
  if (!gate.allowed) return { status: "denied", message: gate.notice };

  const { data: started, error: startError } = await supabase.functions.invoke("generate-video", {
    body: {
      projectId: data.project_id,
      // The stored prompt is already the enhanced one that produced this render,
      // so it is sent as is. Enhancing it a second time would drift the brief
      // and make a regenerate quietly a different request.
      prompt: data.prompt,
      aspectRatio: data.aspect_ratio,
    },
  });

  const generationId = (started as { generationId?: string } | null)?.generationId;
  if (startError || !generationId) {
    logger.warn("could not regenerate", { error: startError?.message });
    return { status: "error", message: "Could not start that render just now" };
  }

  /*
   * Recorded as an assistant message so the new draft survives a reload, the
   * same way an ordinary turn does. Inserted directly rather than through
   * `append_turn`, because a regenerate has no user message in front of it and
   * inventing one would put words in the user's mouth.
   */
  const { error: messageError } = await supabase.from("messages").insert({
    project_id: data.project_id,
    user_id: user.id,
    role: "assistant",
    content: REGENERATE_REPLY,
    generation_id: generationId,
  });
  if (messageError)
    logger.error("could not record regenerated draft", {
      error: messageError.message,
    });

  revalidatePath(`/dashboard/c/${data.project_id}`);
  revalidatePath("/dashboard", "layout");
  return { status: "ok", generationId };
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
 * them.
 *
 * Signed in only. This had no check at all, and unlike every other mutating
 * action here the thing it authorizes is not a row the caller owns but the
 * shared knowledge base every account's generations are enhanced against: an
 * anonymous caller could send arbitrary chunk ids marked `rejected` and weaken
 * chunks that had nothing to do with anything they made. Requiring a session
 * does not verify the ids came from a generation this account actually ran,
 * because nothing here persists which chunks fed which generation to check
 * that against, but it does turn an anonymous, unlimited attack into one an
 * accountable, individually-blockable account has to be signed into.
 */
export async function recordGenerationOutcome(input: z.input<typeof outcomeSchema>): Promise<void> {
  const parsed = outcomeSchema.safeParse(input);
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await recordChunkOutcome(parsed.data.chunkIds, parsed.data.outcome, parsed.data.editDistance);
}
