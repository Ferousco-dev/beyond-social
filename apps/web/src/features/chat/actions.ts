"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ATTACHMENT_KINDS } from "@/lib/chat/attachments";
import { writeReply } from "@/lib/chat/reply";
import { isSupabaseConfigured } from "@/lib/env";
import { attachmentsShowAPerson, hasCurrentConsent } from "@/lib/generation/consent-gate";
import { preferredModel } from "@/lib/generation/preferred-model";
import { checkVideoRun } from "@/lib/generation/gate";
import { getLatestDirectedPrompt } from "@/lib/generation/history";
import { classify } from "@/lib/generation/intent";
import { describeDurations, maxSecondsFor, supportsDuration } from "@/lib/generation/model-limits";
import { refinePrompt } from "@/lib/generation/refine";
import { logger } from "@/lib/logger";
import { runWithAiUser } from "@/lib/ai/request-user";
import { extractMemories } from "@/lib/memory/extract";
import { findRelatedConversations, indexMessage, renderRelated } from "@/lib/memory/conversations";
import { recallFacts, rememberFacts, renderMemories } from "@/lib/memory/store";
import { getSummary, updateSummary } from "@/lib/memory/summarise";
import { traceparent, withActionTrace } from "@/lib/observability/trace";
import { enhancePrompt } from "@/lib/prompt-engine/enhance";
import { platformFromAspect, productTypeFromAttachments } from "@/lib/prompt-engine/hints";
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

/** The composer's ceiling: four reference photos plus one voice clip. */
const MAX_ATTACHMENTS = 5;

const sendSchema = z.object({
  /** `new` means no project exists yet. */
  projectId: z.string().min(1),
  prompt: z.string().trim().min(1, "Describe the video first").max(2000),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  imageUrls: z.array(z.string().url()).max(4).optional(),
  /**
   * Footage to edit or copy motion from, as object paths in the video bucket.
   * One at a time: every model that reads video takes exactly one.
   */
  videoPaths: z.array(z.string().min(1)).max(1).optional(),
  /**
   * Object paths, not URLs. The signed URLs in `imageUrls` are what the
   * provider fetches and they expire in two hours; the path is what the thread
   * stores so it can re-sign and still render the attachment next week.
   */
  attachments: z
    .array(z.object({ kind: z.enum(ATTACHMENT_KINDS), path: z.string().min(1) }))
    .max(MAX_ATTACHMENTS)
    .optional(),
  shots: z
    .array(z.object({ prompt: z.string().trim().min(1).max(500), duration: z.number().int().min(1).max(12) }))
    .max(5)
    .optional(),
});

export type SendResult =
  /**
   * A photo of a person is attached and the caller has not accepted the current
   * likeness wording. Nothing was created: no project, no message, no render.
   * The client asks, records the acceptance, and sends the same turn again.
   */
  | { status: "consent" }
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in again to continue" };

  // Everything below reaches the model gateway, and the gateway keys its rate
  // limit on this. Without it every call landed in one shared `anonymous`
  // bucket, so the whole platform throttled together.
  return runWithAiUser(user.id, () => sendForUser(parsed.data, user.id, supabase));
}

async function sendForUser(
  parsed: z.output<typeof sendSchema>,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SendResult> {
  const { prompt, aspectRatio, imageUrls, videoPaths, attachments, shots } = parsed;
  const user = { id: userId };

  // The paths come back from the client, so ownership is re-checked here rather
  // than assumed, exactly as the upload actions do. `append_turn` filters these
  // too, but it does so silently, and a caller that sent something wrong is
  // better told than quietly ignored.
  if (attachments?.some((attachment) => !attachment.path.startsWith(`${user.id}/`))) {
    return { status: "error", message: "Those attachments could not be saved" };
  }

  // The same ownership check for footage, which lives in its own bucket under
  // the same per-user prefix.
  if (videoPaths?.some((path) => !path.startsWith(`${user.id}/`))) {
    return { status: "error", message: "That video could not be used" };
  }

  /*
   * Checked before anything is created, so a refusal leaves no half-made
   * project and no message promising a video that was never started. The turn
   * is sent again unchanged once the attestation is recorded.
   *
   * Only for photos of people: `needsLikenessConsent` asks the classification
   * made at upload, so a product shot never reaches this.
   */
  const photoPaths =
    attachments?.filter((item) => item.kind === "photo").map((item) => item.path) ?? [];

  // Asked once and used twice: it decides whether the attestation is required,
  // and it tells the retriever what kind of video this is.
  const showsPerson = await attachmentsShowAPerson(supabase, user.id, photoPaths);
  if (showsPerson && !(await hasCurrentConsent(supabase, user.id))) {
    return { status: "consent" };
  }

  // The project is created on the first message, not on page load, so opening
  // the composer and changing your mind leaves nothing behind.
  let projectId = parsed.projectId;
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
  const [previousPrompt, previous, memories, summary, related] = await Promise.all([
    getLatestDirectedPrompt(supabase, projectId),
    supabase.rpc("project_thread", { p_project: projectId }),
    recallFacts(prompt),
    getSummary(projectId),
    // Past conversations, excluding this one: it is the closest match to itself
    // and returning it as "earlier work" would be noise.
    findRelatedConversations(prompt, projectId),
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
    /*
     * The retriever ranks knowledge partly on how well a chunk's declared
     * applicability matches the request, and neither hint was ever supplied,
     * so that dimension scored a flat 0.5 for every chunk and discriminated
     * nothing. Both are derived from what the turn already knows rather than
     * asked for.
     */
    const enhanced = await enhancePrompt({
      prompt,
      ...(platformFromAspect(intent.aspectRatio ?? aspectRatio)
        ? { platform: platformFromAspect(intent.aspectRatio ?? aspectRatio)! }
        : {}),
      productType: productTypeFromAttachments({
        hasPhoto: photoPaths.length > 0,
        hasAudio: attachments?.some((item) => item.kind === "audio") ?? false,
        showsPerson,
      }),
    });
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

  /*
   * Which model runs decides how long a clip can be, so it has to be known
   * before the length is judged. This check used to run against one hardcoded
   * set, which was veo's, and told a Kling user that clips can be four, six or
   * eight seconds when Kling does fifteen: the app refusing something it can do.
   */
  const chosenModel = await preferredModel(supabase, user.id, "video");

  // Asking for a length we cannot render is worth saying out loud. Silently
  // producing eight seconds when someone asked for thirty is the kind of thing
  // that makes a tool feel like it is not listening.
  const requestedDuration = intent.durationSeconds;
  const usableDuration =
    requestedDuration !== null && supportsDuration(chosenModel, requestedDuration)
      ? requestedDuration
      : null;
  if (requestedDuration !== null && usableDuration === null) {
    notice = `This model makes clips of ${describeDurations(chosenModel)}, so this one is ${maxSecondsFor(chosenModel)} seconds rather than ${requestedDuration}.`;
  }

  // A question costs nothing. This is the whole point of classifying: not
  // spending a credit on a video the person did not ask for.
  const startGeneration = async (): Promise<void> => {
    if (intent.intent === "ask") return;

    // Tier and balance, checked server-side before the provider is called. A
    // refusal here costs nothing and leaves no half-started generation row.
    const gate = await checkVideoRun();
    if (!gate.allowed) {
      notice = gate.notice;
      return;
    }

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
          // The model the user picked on the models page, if they picked one.
          // Absent, the edge function uses its own default, so a stale or
          // missing preference never stops a video being made.
          model: chosenModel ?? undefined,
          aspectRatio: intent.aspectRatio ?? aspectRatio,
          ...(videoPaths && videoPaths.length > 0 ? { videoPaths } : {}),
          ...(usableDuration ? { duration: usableDuration } : {}),
          imageUrls,
          // Preferred over imageUrls. The edge function reads these from
          // storage and hands the bytes to the provider, so the provider never
          // has to reach our storage: a signed link expires, and in local
          // development it is a loopback address that resolves to the
          // provider's own machine.
          imagePaths: attachments
            ?.filter((attachment) => attachment.kind === "photo")
            .map((attachment) => attachment.path),
          ...(shots && shots.length > 0 ? { shots } : {}),
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
      memories: [renderMemories(memories), renderRelated(related)].filter(Boolean).join("\n\n"),
      summary,
    }),
  ]);

  const { data: turnRows, error: turnError } = await supabase.rpc("append_turn", {
    p_project: projectId,
    p_user_content: prompt,
    p_assistant_content: reply,
    // The generated type spells an optional argument as undefined, not null.
    p_generation: generationId ?? undefined,
    p_attachments: attachments ?? [],
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

  // Makes this turn findable by a later "continue what we started". Indexed from
  // the row that was actually written, so the embedding can never point at a
  // message id that does not exist.
  const userMessage = (turnRows as { id: string; role: string }[] | null)?.find(
    (row) => row.role === "user",
  );
  if (userMessage) void indexMessage(userMessage.id, projectId, prompt);

  // Also after the fact: the summary is for the *next* turn, so making this one
  // wait for it would be charging the user for someone else's benefit.
  void updateSummary(projectId, [...history, { role: "user", content: prompt }]);

  revalidatePath(`/dashboard/c/${projectId}`);
  // The sidebar is rendered by the dashboard layout, which a page-level
  // revalidate does not touch, so a new project did not appear in it until a
  // full reload. Every turn bumps the project's updated_at and reorders that
  // list too, so this is not only a first-message concern.
  revalidatePath("/dashboard", "layout");
  return { status: "ok", projectId, generationId, reply, intent: intent.intent, notice };
}
