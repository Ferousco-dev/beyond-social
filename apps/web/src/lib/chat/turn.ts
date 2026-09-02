import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { ATTACHMENT_KINDS } from "@/lib/chat/attachments";
import { streamReply, writeReply } from "./reply";
import { attachmentsShowAPerson, hasCurrentConsent } from "@/lib/generation/consent-gate";
import { preferredModel } from "@/lib/generation/preferred-model";
import { chooseModel } from "@/lib/generation/choose-model";
import { checkVideoRun } from "@/lib/generation/gate";
import { isUpgradeReason } from "@/lib/credits/types";
import { getLatestDirectedPrompt } from "@/lib/generation/history";
import { classify, isPleasantry } from "@/lib/generation/intent";
import { embedOnce } from "@/lib/memory/embed-once";
import { describeDurations, maxSecondsFor, supportsDuration } from "@/lib/generation/model-limits";
import { foldShots } from "@/lib/generation/shot-fold";
import { refinePrompt } from "@/lib/generation/refine";
import { describeSavedSubjects, findSavedSubjects } from "@/lib/generation/saved-subjects";
import { logger } from "@/lib/logger";
import { edgeFunctionErrorMessage } from "@/lib/supabase/function-error";
import {
  applyAnswers,
  buildClarification,
  CLARIFY_FRAMING,
  needsClarification,
  type ClarifyQuestion,
} from "@/lib/generation/clarify";
import { extractMemories } from "@/lib/memory/extract";
import { findRelatedConversations, indexMessage, renderRelated } from "@/lib/memory/conversations";
import { recallFacts, rememberFacts, renderMemories } from "@/lib/memory/store";
import { getSummary, updateSummary } from "@/lib/memory/summarise";
import { traceparent } from "@/lib/observability/trace";
import { enhancePrompt } from "@/lib/prompt-engine/enhance";
import { platformFromAspect, productTypeFromAttachments } from "@/lib/prompt-engine/hints";
import { learnFromPrompt } from "@/lib/prompt-engine/learn";
import { type createClient } from "@/lib/supabase/server";

import { toHistory } from "./history";
import { setAiOrg } from "@/lib/ai/request-org";

/**
 * One turn of the conversation, from a validated request to a persisted reply.
 *
 * Lifted out of the server action so it can have a second caller. A route that
 * streams the turn needs the same pipeline, and the alternative was exporting
 * this from a `"use server"` file, where every export becomes a public
 * endpoint: this takes `userId` as an argument, so exporting it there would
 * have let anyone run a turn as anyone.
 *
 * The action remains the only place that decides who the caller is.
 */
const ASPECT_RATIOS = ["16:9", "9:16", "Auto"] as const;

/** The composer's ceiling: four reference photos plus one voice clip. */
const MAX_ATTACHMENTS = 5;

/**
 * What the turn is doing, as it does it.
 *
 * Emitted at the real boundaries rather than on a timer. The interface used to
 * advance a list of stage labels off elapsed milliseconds, which meant it was
 * confidently wrong whenever a step took longer than the guess: a slow
 * classification showed "Writing the direction" while the classifier was still
 * running.
 *
 * Optional throughout. A caller that only wants the result passes nothing and
 * the pipeline behaves exactly as it did.
 */
export type TurnStage =
  "understanding" | "recalling" | "directing" | "rendering" | "replying" | "saving";

export interface TurnEvents {
  readonly onStage?: (stage: TurnStage) => void;
  /** Pieces of the reply as they are written. */
  readonly onReplyChunk?: (text: string) => void;
}

/**
 * How long the turn will wait to be well informed before answering anyway.
 *
 * Set above the cold path, not merely above the warm one. The warm path is an
 * embedding at about 600ms plus a vector search; a fresh serverless instance
 * pays about 2.3 seconds for the same embedding, because its first connection
 * to the embedder is a new one.
 *
 * A tighter budget would turn that cold turn into a reply with no memory in it,
 * which is the wrong trade for this product: somebody who has told us their
 * name notices being greeted wrongly far more than they notice a slower reply.
 * So this is a guard against a read that has genuinely hung, not a latency
 * dial, and in normal running nothing is ever dropped.
 */
const GROUNDING_BUDGET_MS = 4_000;

/**
 * The value, or the fallback if it takes too long.
 *
 * The work is not cancelled, only stopped being waited on: these are reads, so
 * letting one finish unobserved costs nothing, and cancelling would need every
 * caller to thread a signal through for no gain.
 */
async function deadline<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    // Or the timer holds the process open for its full duration after a fast
    // read has already answered.
    if (timer) clearTimeout(timer);
  }
}

export const sendSchema = z.object({
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
    .array(
      z.object({
        prompt: z.string().trim().min(1).max(500),
        duration: z.number().int().min(1).max(12),
      }),
    )
    .max(5)
    .optional(),
  /**
   * True once the caller has answered or skipped the clarifying questions.
   * Bounds the exchange to one round: without it a model that keeps finding
   * something to ask about could hold a paid action indefinitely.
   */
  clarified: z.boolean().optional(),
  /**
   * What the caller said in answer to the clarifying questions, keyed by label.
   * Folded into the brief on the server, where the prompt is built, so the
   * client never has to compose a directed prompt of its own.
   */
  clarifyAnswers: z.record(z.string().max(32), z.string().max(80)).optional(),
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
      intent: "create" | "adjust" | "ask" | "chat";
      /** Present when the video pipeline refused, so the UI can say why. */
      notice?: string;
      /** True when `notice` is a denial an upgrade would fix. */
      noticeUpgrade: boolean;
    }
  /**
   * The request was not specific enough to spend a credit on. Nothing was
   * created: no project, no message, no render. The client asks, folds the
   * answers into the brief, and sends the same turn again with `clarified`.
   */
  | {
      status: "clarify";
      questions: readonly ClarifyQuestion[];
      /** What the assistant says before the questions, so the pause is explained. */
      framing: string;
    }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

/** The first line of a brief makes a better project name than "New project". */

function titleFrom(prompt: string): string {
  const firstSentence = prompt.split(/[.!?\n]/)[0]?.trim() ?? prompt;
  const title = firstSentence.length > 0 ? firstSentence : prompt;
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

/**
 * Runs the turn for a caller the action has already authenticated.
 */
export async function runTurn(
  parsed: z.output<typeof sendSchema>,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  events: TurnEvents = {},
): Promise<SendResult> {
  const { aspectRatio, imageUrls, videoPaths, attachments, shots } = parsed;
  const user = { id: userId };
  const stage = (next: TurnStage): void => events.onStage?.(next);

  // The answers become part of what was asked for, not a hidden rider on it:
  // the thread stores this, so what the user sees is what was sent to render.
  const prompt = parsed.clarifyAnswers
    ? applyAnswers(parsed.prompt, parsed.clarifyAnswers)
    : parsed.prompt;

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
  // A face and a voice together is an avatar job, whatever the sentence says.
  const voiceAttached = attachments?.some((item) => item.kind === "audio") ?? false;
  if (showsPerson && !(await hasCurrentConsent(supabase, user.id))) {
    return { status: "consent" };
  }

  /*
   * What did they actually mean? Every message used to start a generation,
   * which spent a credit answering a question and turned "make it slower" into
   * an unrelated video.
   *
   * Classified before anything is created. A new project has no prior prompt by
   * definition, so that case needs no read at all; an existing one is read
   * first. Doing this here rather than after the parallel block costs one round
   * trip on an adjustment and buys two things: a turn that ends in a question
   * leaves no empty project in the sidebar, and it stops before the enhancement
   * pass, which is a model call spent directing a video we are not making yet.
   */
  /*
   * The previous direction, and which organisation to bill this turn to.
   *
   * The org read is paired with a query that was happening anyway, so it costs
   * no round trip. The obvious home for it is alongside the recall reads
   * further down, which also run together, and that is too late: the intent
   * classification happens before them, so that one call would be recorded
   * against no organisation and org spend would under-report by a call in every
   * turn.
   *
   * A project created by this turn is personal by construction, since the
   * insert below sets no org, so the null default is already right for it.
   */
  const [previousPrompt, owner] =
    parsed.projectId === "new"
      ? [null, null]
      : await Promise.all([
          getLatestDirectedPrompt(supabase, parsed.projectId),
          supabase.from("projects").select("org_id").eq("id", parsed.projectId).maybeSingle(),
        ]);
  setAiOrg((owner?.data as { org_id?: string | null } | null)?.org_id ?? null);
  /*
   * Whether this turn is worth grounding, decided before the classification
   * rather than from it.
   *
   * This is a string test, so it can be answered instantly, and that is what
   * lets the embedding start now. The reads it feeds do not depend on what the
   * message turns out to be: a memory lookup is the same lookup whether the
   * sentence was a question or a brief.
   */
  const grounded = !isPleasantry(prompt);

  /*
   * The embedding, prepared but not started.
   *
   * Nothing here needs it yet, and most turns never will. It is the most
   * expensive thing available to a turn, about 600ms warm and 2.3 seconds on a
   * cold instance where the connection to the embedder is new, so the readers
   * below ask for it only when they genuinely have a choice to make. If both
   * ask, it happens once; if neither does, it never happens.
   */
  stage("understanding");
  const vector = embedOnce(prompt);

  const intent = await classify(prompt, previousPrompt !== null);

  /*
   * Ask before spending.
   *
   * The decision is made in `needsClarification` from the classifier's own
   * confidence and from what the brief plainly lacks, never by asking a model
   * whether it feels unsure. Nothing is created on this path: no project, no
   * message, no render. The client answers and sends the same turn again with
   * `clarified` set, which is also what stops a second round.
   */
  // The whole rule lives in `needsClarification`, including the one-round bound,
  // so there is a single place to read to know when this fires.
  const clarifyReason = needsClarification({
    classification: intent,
    prompt,
    hasAttachments: (imageUrls?.length ?? 0) > 0 || (videoPaths?.length ?? 0) > 0,
    alreadyAsked: parsed.clarified === true,
  });

  if (clarifyReason !== null) {
    const questions = await buildClarification(prompt, intent);
    /*
     * Logged whether or not it asks, because the two thresholds this rule turns
     * on were picked by judgement and there was no way to check them against
     * what people actually send. `asked: false` is the interesting row: the
     * blunt gate fired and the model then found nothing worth asking, which is
     * the shape of a floor set too high.
     */
    logger.info("clarify gate fired", {
      reason: clarifyReason,
      confidence: intent.confidence,
      promptChars: prompt.trim().length,
      asked: questions.length > 0,
      questions: questions.length,
    });

    if (questions.length > 0) {
      return { status: "clarify", questions, framing: CLARIFY_FRAMING[clarifyReason] };
    }
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

  // Recall joins the existing parallel reads rather than adding a stage: it is
  // an independent lookup, and running it in series would put a round trip in
  // front of every message.
  stage("recalling");
  const [previous, memories, summary, related] = await Promise.all([
    // Always, and unbounded: the thread is what the screen renders rather than
    // context for a model, so a turn without it has nothing to show.
    supabase.rpc("project_thread", { p_project: projectId }),
    // Bounded so a read that has genuinely hung cannot take the turn with it.
    grounded ? deadline(recallFacts(prompt, undefined, vector), GROUNDING_BUDGET_MS, []) : [],
    grounded ? deadline(getSummary(projectId), GROUNDING_BUDGET_MS, null) : null,
    // Past conversations, excluding this one: it is the closest match to itself
    // and returning it as "earlier work" would be noise.
    grounded && vector
      ? deadline(
          findRelatedConversations(prompt, projectId, undefined, vector),
          GROUNDING_BUDGET_MS,
          [],
        )
      : [],
  ]);

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
    stage("directing");
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

  /*
   * Appended after enhancement, not before.
   *
   * The enhancement pass rewrites the brief against retrieved craft knowledge,
   * and a rewrite is free to paraphrase. "Feature this exact product" surviving
   * as "show a product like this" is precisely the failure this exists to
   * prevent, so the constraint goes on last where nothing else can soften it.
   */
  const subjects = await findSavedSubjects(supabase, photoPaths);
  const direction = describeSavedSubjects(subjects);
  if (direction !== "") finalPrompt = `${finalPrompt}\n\n${direction}`;

  // Carries the reason a past render failed into the turn it belongs to, so
  // "why did that fail" is answered from the record rather than guessed at.
  const history = toHistory(previous.data);

  let generationId: string | null = null;
  let notice: string | undefined;
  let noticeUpgrade = false;

  /*
   * Which model runs decides how long a clip can be, so it has to be known
   * before the length is judged. This check used to run against one hardcoded
   * set, which was veo's, and told a Kling user that clips can be four, six or
   * eight seconds when Kling does fifteen: the app refusing something it can do.
   */
  /*
   * A stored preference still wins, then the chooser.
   *
   * Almost nobody has a preference: setting one was a page that has since been
   * removed, and the rows of those who did are honoured rather than deleted.
   * Everybody else used to fall through to the edge function's default, which
   * is why every video was Veo at six credits while five other live models sat
   * in the catalogue unused.
   *
   * Anything that costs more than this plan's everyday generator is not taken
   * yet. The chooser reports it, and the interface that asks about it is the
   * next piece of work: until then a surprise five times charge is worse than
   * a video made by the ordinary model, so the workhorse is used and the
   * choice is logged.
   */
  const preference = await preferredModel(supabase, user.id, "video");
  const choice =
    preference === null
      ? await chooseModel(supabase, user.id, prompt, videoPaths, showsPerson && voiceAttached)
      : null;
  if (choice?.worthConfirming) {
    logger.info("skipped a costlier model until it can be confirmed", {
      model: choice.modelId,
      credits: choice.creditCost,
      reason: choice.reason,
    });
  }
  if (choice?.attachmentIgnored) {
    const attachmentNotice =
      'That attached video isn\'t used for this yet. Ask to "copy the movement" if you want its motion carried over, otherwise this generates from your prompt alone.';
    notice = notice === undefined ? attachmentNotice : `${notice} ${attachmentNotice}`;
  }
  const chosenModel = preference ?? (choice && !choice.worthConfirming ? choice.modelId : null);

  /*
   * A shot list only survives as beats on a model that cuts. On anything else
   * it becomes direction inside one take, because the dispatcher refuses a list
   * it cannot honour and a refused turn is worse than a truthful compromise.
   */
  const folded = foldShots(shots, chosenModel);
  if (folded.addendum !== "") finalPrompt = `${finalPrompt}\n\n${folded.addendum}`;
  if (folded.notice !== null) notice = folded.notice;

  // Asking for a length we cannot render is worth saying out loud. Silently
  // producing eight seconds when someone asked for thirty is the kind of thing
  // that makes a tool feel like it is not listening.
  const requestedDuration = intent.durationSeconds;
  const usableDuration =
    requestedDuration !== null && supportsDuration(chosenModel, requestedDuration)
      ? requestedDuration
      : null;
  if (requestedDuration !== null && usableDuration === null) {
    const lengths = `This model makes clips of ${describeDurations(chosenModel)}, so this one is ${maxSecondsFor(chosenModel)} seconds rather than ${requestedDuration}.`;
    // Both can be true of the same turn, and the second one silently replacing
    // the first told the user only half of what changed about their request.
    notice = notice === undefined ? lengths : `${notice} ${lengths}`;
  }

  // A question costs nothing. This is the whole point of classifying: not
  // spending a credit on a video the person did not ask for.
  const startGeneration = async (): Promise<void> => {
    stage("rendering");
    // Neither a question nor a greeting is a request for a video. This is the
    // whole point of classifying: not spending a credit on "hello".
    if (intent.intent === "ask" || intent.intent === "chat") return;

    // Tier and balance, checked server-side before the provider is called. A
    // refusal here costs nothing and leaves no half-started generation row.
    // Priced against the model actually being run, not a fixed default.
    const gate = await checkVideoRun(chosenModel ?? undefined);
    if (!gate.allowed) {
      notice = gate.notice;
      noticeUpgrade = isUpgradeReason(gate.reason);
      return;
    }
    // Said alongside whatever else this turn already has to say, not instead
    // of it: a shot-fold or duration notice is still true, and a low balance
    // is a separate fact about the account rather than about this render.
    if (gate.lowBalanceNotice) {
      notice = notice === undefined ? gate.lowBalanceNotice : `${notice} ${gate.lowBalanceNotice}`;
      // A cliff is still a cliff even though this run went ahead; the same
      // upgrade link the hard denial offers belongs here too.
      noticeUpgrade = true;
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
          ...(folded.shots && folded.shots.length > 0 ? { shots: folded.shots } : {}),
          sourceChunks: chunkIds,
        },
      });
      if (error) {
        // `error.message` is a library-hardcoded string, the same for every
        // failure. The reason worth showing is in the response body, which
        // this reads back off `error.context`, a `FunctionsHttpError` only.
        const detail = await edgeFunctionErrorMessage(error);
        logger.warn("generation could not start", { error: error.message, detail });
        notice =
          detail ?? "Could not start the video just now. Your message was saved, so try again.";
        return;
      }
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
  const replyContext = {
    brief: prompt,
    directedPrompt: intent.intent === "ask" || intent.intent === "chat" ? null : finalPrompt,
    history,
    intent: intent.intent,
    name,
    memories: [renderMemories(memories), renderRelated(related)].filter(Boolean).join("\n\n"),
    summary,
  };

  /*
   * Streamed only when somebody is listening.
   *
   * A caller with no `onReplyChunk` gets the same blocking call as before, so
   * the action path is unchanged. The assembled text is what gets persisted
   * either way: what the thread stores has to be the whole reply, not the last
   * piece of it.
   */
  const writeOrStream = async (): Promise<string> => {
    stage("replying");
    if (!events.onReplyChunk) return writeReply(replyContext);

    let assembled = "";
    for await (const piece of streamReply(replyContext)) {
      assembled += piece;
      events.onReplyChunk(piece);
    }
    return assembled;
  };

  const [, reply] = await Promise.all([startGeneration(), writeOrStream()]);

  stage("saving");
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

  // The row that was actually written, so the learning candidate and the
  // conversation index are both keyed on an id that exists.
  const persistedUserMessage = (turnRows as { id: string; role: string }[] | null)?.find(
    (row) => row.role === "user",
  );

  // Only a fresh brief teaches the engine anything: an adjustment is a delta
  // and a question is not a prompt at all.
  // Same reasoning as the writes below: worth doing after the reply, worthless
  // if the process is gone before it runs.
  //
  // Keyed on the persisted message, so a retried ingestion refiles the same
  // candidate rather than filling the review queue with copies of one prompt.
  if (intent.intent === "create") {
    const sourceRef = persistedUserMessage ? `message:${persistedUserMessage.id}` : undefined;
    after(() => learnFromPrompt(prompt, finalPrompt, sourceRef));
  }

  /*
   * The same judgement applies afterwards, and matters more here: these are
   * three writes on every turn, one of them a model call.
   *
   * Small talk has nothing to extract, and indexing it actively harms retrieval,
   * because "hi" is similar to every other "hi" and would surface as the most
   * related earlier conversation. A summary that records the greetings is worse
   * than one that does not.
   */
  if (grounded) {
    /*
     * Handed to `after` rather than left as a floating promise.
     *
     * All three still run once the reply is on its way, which is the point:
     * extraction is a model call that yields nothing on most turns, and making
     * somebody wait for it would be paying latency for a usually-empty result.
     *
     * But `void somePromise()` is a bet that the process outlives the response,
     * and on serverless it does not: the function can be torn down the moment
     * the response is sent, taking the unfinished write with it. That is not
     * theoretical here. A name correction landed 0.4s after its own turn, which
     * is late enough that the next question had already looked for it and found
     * nothing, and only landed at all because the teardown happened to be slow.
     *
     * `after` is Next's contract for exactly this: the platform keeps the
     * invocation alive until the work finishes.
     */
    after(async () => {
      const facts = await extractMemories(prompt, reply);
      await rememberFacts(facts, projectId);
    });

    // Makes this turn findable by a later "continue what we started". Indexed
    // from the row that was actually written, so the embedding can never point
    // at a message id that does not exist.
    const userMessage = persistedUserMessage;
    if (userMessage) after(() => indexMessage(userMessage.id, projectId, prompt));

    // Also after the fact: the summary is for the *next* turn, so making this
    // one wait for it would be charging the user for someone else's benefit.
    after(() => updateSummary(projectId, [...history, { role: "user", content: prompt }]));
  }

  revalidatePath(`/dashboard/c/${projectId}`);
  // The sidebar is rendered by the dashboard layout, which a page-level
  // revalidate does not touch, so a new project did not appear in it until a
  // full reload. Every turn bumps the project's updated_at and reorders that
  // list too, so this is not only a first-message concern.
  revalidatePath("/dashboard", "layout");
  return {
    status: "ok",
    projectId,
    generationId,
    reply,
    intent: intent.intent,
    notice,
    noticeUpgrade,
  };
}
