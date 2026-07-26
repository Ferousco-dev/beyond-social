"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeReply } from "@/lib/chat/reply";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
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
      /** Null when generation could not start; the reply still stands. */
      generationId: string | null;
      reply: string;
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

  // Grounded in the knowledge base when the engine is available, and the raw
  // prompt otherwise, so the engine improves output without gating it.
  const enhanced = await enhancePrompt({ prompt });
  const finalPrompt = enhanced?.text ?? prompt;

  let generationId: string | null = null;
  let notice: string | undefined;
  try {
    const { data, error } = await supabase.functions.invoke("generate-video", {
      body: {
        projectId,
        prompt: finalPrompt,
        aspectRatio,
        imageUrls,
        sourceChunks: enhanced?.chunkIds ?? [],
      },
    });
    if (error) throw new Error(error.message);
    generationId = (data as { generationId?: string } | null)?.generationId ?? null;
    if (!generationId) notice = "The video service did not accept that. Nothing was charged.";
  } catch (error) {
    // A failed generation must not lose the message. The turn is still recorded
    // so the thread reads correctly and the user can retry.
    logger.warn("generation could not start", {
      error: error instanceof Error ? error.message : String(error),
    });
    notice = "Could not start the video just now. Your message was saved, so try again.";
  }

  const { data: previous } = await supabase.rpc("project_thread", { p_project: projectId });
  const history = Array.isArray(previous)
    ? (previous as { role: string; content: string }[]).map((row) => ({
        role: row.role,
        content: row.content,
      }))
    : [];

  const reply = await writeReply({
    brief: prompt,
    directedPrompt: enhanced?.text ?? null,
    history,
  });

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

  // Best-effort background learning from the original phrasing.
  void learnFromPrompt(prompt, enhanced?.text);

  revalidatePath(`/dashboard/c/${projectId}`);
  return { status: "ok", projectId, generationId, reply, notice };
}
