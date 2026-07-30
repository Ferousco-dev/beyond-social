"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeReply } from "@/lib/chat/reply";
import { isSupabaseConfigured } from "@/lib/env";
import { getLatestDirectedPrompt } from "@/lib/generation/history";
import { classify, isSupportedDuration, SUPPORTED_DURATIONS } from "@/lib/generation/intent";
import { refinePrompt } from "@/lib/generation/refine";
import { logger } from "@/lib/logger";
import { extractMemories } from "@/lib/memory/extract";
import { recallFacts, rememberFacts, renderMemories } from "@/lib/memory/store";
import { getSummary, updateSummary } from "@/lib/memory/summarise";
import { traceparent, withActionTrace } from "@/lib/observability/trace";
import { enhancePrompt } from "@/lib/prompt-engine/enhance";
import { learnFromPrompt } from "@/lib/prompt-engine/learn";
import { createClient } from "@/lib/supabase/server";

/**
 * Sending a turn.
 *
 * One action does the whole turn: create the project if this is the first
 * message, ground the prompt, start the generation, write the reply, and persist
 * both messages. Doing it server-side is what makes a refresh survivable, which
 * the previous client-only version was not.
 */

const ASPECT_RATIOS = ["16:9", "9:16", "Auto"] as const;

const sendSchema = z.object({
  /** `new` means no project exists yet. */
  projectId: z.string().min(1),
  prompt: z.string().trim().min(1, "Describe the video first").max(2000),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  imageUrls: z.array(z.string().url()).max(4).optional(),
});

export type SendResult =
  | {
      status: "ok";
      projectId: string;
      /** Null when generation could not start, or was not wanted. */
      generationId: string | null;
      reply: string;
      /** What the message was taken to mean, so the UI can reflect it. */
      intent: "create" | "adjust" | "ask";
      /** Present when the video pipeline refused, so the UI can say why. */
      notice?: string;
    }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/** The first line of a brief makes a better project name than "New project". */
function titleFrom(prompt: string): string {
  const firstSentence = prompt.split(/[.!?\n]/)[0]?.trim() ?? prompt;
  const title = firstSentence.length > 0 ? firstSentence : prompt;
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

export async function sendMessage(input: z.input<typeof sendSchema>): Promise<SendResult> {
  // Everything below, including the model calls and the edge function invoke,
  // runs inside one trace, so a turn that goes wrong is one log query.
  return withActionTrace("sendMessage", () => send(input));
}

async function send(input: z.input<typeof sendSchema>): Promise<SendResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!isSupabaseConfigured) return { status: "unconfigured" };

  const { prompt, aspectRatio, imageUrls } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to continue" };

  // The project is created on the first message, not on page load, so opening
  // the composer and changing your mind leaves nothing behind.
  let projectId = parsed.data.projectId;
  if (projectId === "new") {
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, title: titleFrom(prompt) })
      .select("id")
      .single();
    const created = (data as { id?: string } | null)?.id;
    if (error || !created) return { status: "error", message: "Could not start that project" };
    projectId = created;
  }

  // What did they actually mean? Every message used to start a generation,
  // which spent a credit answering a question and turned "make it slower" into
  // an unrelated video.
  //
  // The prior prompt and the thread are independent reads, so they go together;
  // classification needs the first of them, so it follows.
  // Recall joins the existing parallel reads rather than adding a stage: it is
  // an independent lookup, and running it in series would put an embedding round
  // trip in front of every message.
  const [previousPrompt, previous, memories, summary] = await Promise.all([
    getLatestDirectedPrompt(supabase, projectId),
    supabase.rpc("project_thread", { p_project: projectId }),
    recallFacts(prompt),
    getSummary(projectId),
  ]);
  const intent = await classify(prompt, previousPrompt !== null);

  let finalPrompt = prompt;
  let chunkIds: string[] = [];

  if (intent.intent === "adjust" && previousPrompt) {
    // The stored prompt is the full direction; the message is only the delta.
    // Editing the former is what keeps the subject stable across versions.
    const refined = await refinePrompt({ previousPrompt, change: prompt });
    finalPrompt = refined ?? previousPrompt;
  } else if (intent.intent === "create") {
    const enhanced = await enhancePrompt({ prompt });
    finalPrompt = enhanced?.text ?? prompt;
    chunkIds = enhanced?.chunkIds ?? [];
  }

  const history = Array.isArray(previous.data)
    ? (previous.data as { role: string; content: string }[]).map((row) => ({
        role: row.role,
        content: row.content,
      }))
    : [];

  let generationId: string | null = null;
  let notice: string | undefined;

  // Asking for a length we cannot render is worth saying out loud. Silently
  // producing eight seconds when someone asked for thirty is the kind of thing
  // that makes a tool feel like it is not listening.
  const requestedDuration = intent.durationSeconds;
  const usableDuration =
    requestedDuration !== null && isSupportedDuration(requestedDuration) ? requestedDuration : null;
  if (requestedDuration !== null && usableDuration === null) {
    notice = `Clips can be ${SUPPORTED_DURATIONS.join(", ")} seconds long, so this one is ${SUPPORTED_DURATIONS[SUPPORTED_DURATIONS.length - 1]} seconds rather than ${requestedDuration}.`;
  }

  // A question costs nothing. This is the whole point of classifying: not
  // spending a credit on a video the person did not ask for.
  const startGeneration = async (): Promise<void> => {
    if (intent.intent === "ask") return;
    try {
      // Hands the trace across the process boundary. The edge function stores it
      // on the generation row, which is how the callback that arrives minutes
      // later, in a different process, rejoins this request's trace.
      const parent = traceparent();
      const { data, error } = await supabase.functions.invoke("generate-video", {
        ...(parent ? { headers: { traceparent: parent } } : {}),
        body: {
          projectId,
          prompt: finalPrompt,
          // What the message asked for wins over the caller's default; neither
          // is invented when the message is silent about it.
          aspectRatio: intent.aspectRatio ?? aspectRatio,
          ...(usableDuration ? { duration: usableDuration } : {}),
          imageUrls,
          sourceChunks: chunkIds,
        },
      });
      if (error) throw new Error(error.message);
      generationId = (data as { generationId?: string } | null)?.generationId ?? null;
      if (!generationId) notice = "The video service did not accept that. Nothing was charged.";
    } catch (error) {
      // A failed generation must not lose the message. The turn is still
      // recorded so the thread reads correctly and the user can retry.
      logger.warn("generation could not start", {
        error: error instanceof Error ? error.message : String(error),
      });
      notice = "Could not start the video just now. Your message was saved, so try again.";
    }
  };

  /**
   * The render request and the reply are independent, so they run together.
   * Waiting for the provider to acknowledge before starting to write added the
   * whole round trip to how long the user stares at a spinner.
   */
  const [, reply] = await Promise.all([
    startGeneration(),
    writeReply({
      brief: prompt,
      directedPrompt: intent.intent === "ask" ? null : finalPrompt,
      history,
      intent: intent.intent,
      memories: renderMemories(memories),
      summary,
    }),
  ]);

  const { error: turnError } = await supabase.rpc("append_turn", {
    p_project: projectId,
    p_user_content: prompt,
    p_assistant_content: reply,
    // The generated type spells an optional argument as undefined, not null.
    p_generation: generationId ?? undefined,
  });
  if (turnError) {
    logger.error("could not persist turn", { error: turnError.message });
    return { status: "error", message: "Could not save that message" };
  }

  // Only a fresh brief teaches the engine anything: an adjustment is a delta
  // and a question is not a prompt at all.
  if (intent.intent === "create") void learnFromPrompt(prompt, finalPrompt);

  // Deliberately after the turn is persisted, and deliberately not awaited.
  // Extraction costs a model call and yields nothing on most turns, so making
  // the user wait for it would be paying latency for a usually-empty result.
  void extractMemories(prompt, reply).then((facts) => rememberFacts(facts, projectId));

  // Also after the fact: the summary is for the *next* turn, so making this one
  // wait for it would be charging the user for someone else's benefit.
  void updateSummary(projectId, [...history, { role: "user", content: prompt }]);

  revalidatePath(`/dashboard/c/${projectId}`);
  return { status: "ok", projectId, generationId, reply, intent: intent.intent, notice };
}
