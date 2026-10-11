import { type PlanId } from "@/lib/billing/plans";

/**
 * Which model should make this video.
 *
 * The catalogue has had six live models in it for a while and nothing ever
 * chose between them: every generation sent no model at all and fell to the
 * edge function's default, so every video was Veo 3 Fast at six credits and the
 * Kling and Seedance entries were decoration.
 *
 * Decided in code from things that can be checked, not by asking a model. The
 * signals that matter here are structural rather than interpretive: a voice
 * clip and a face is an avatar job whatever the sentence says, and footage to
 * transform is motion control whatever it is described as. A model call would
 * add a round trip and a cost to a decision that regexes and attachment kinds
 * already answer, and it would be wrong in ways nobody could predict.
 *
 * Costs are not written here. They come from the catalogue row, which is what
 * the ledger charges from, so this file cannot drift into quoting a price the
 * account is not billed.
 */

export interface CatalogModel {
  readonly id: string;
  readonly creditCost: number;
  readonly minPlan: PlanId;
  readonly capabilities: readonly string[];
  readonly isActive: boolean;
}

export interface ModelChoice {
  readonly modelId: string;
  readonly creditCost: number;
  /** Said to the user, so it is about their request rather than the catalogue. */
  readonly reason: string;
  /**
   * True when this costs more than the plan's ordinary generator, which is what
   * makes it worth stopping to ask about. Motion control at sixty credits is
   * twenty times Seedance at three, and nobody should discover that afterwards.
   */
  readonly worthConfirming: boolean;
  /**
   * True when footage was attached but nothing here could use it: the restyle
   * path is not active yet, and the prompt did not ask for motion either. The
   * generation still runs, from the prompt alone, and silently dropping the
   * attachment on the floor is worse than a video that ignores it loudly.
   */
  readonly attachmentIgnored?: boolean;
  /**
   * True when a voice clip was attached with nothing here able to speak it: the
   * avatar models need a photo of the person to pair it with, and every other
   * model in the catalogue is silent. The generation still runs and the clip is
   * dropped, so the caller has to say so, for the same reason
   * `attachmentIgnored` exists.
   */
  readonly voiceIgnored?: boolean;
  /**
   * This plan's everyday generator: what `worthConfirming` was measured
   * against, and what runs instead when a costlier choice is declined. Null
   * only when the catalogue held nothing this plan could run at all.
   */
  readonly alternative: { readonly modelId: string; readonly creditCost: number } | null;
}

/** Which plans outrank which, for the `min_plan` check. */
const RANK: Readonly<Record<PlanId, number>> = { free: 0, creator: 1, studio: 2 };

/**
 * The everyday generator for a plan.
 *
 * Seedance is the free tier's: Kling is creator-and-up (migration 0070), and
 * Seedance is the cheapest active model any plan can run, at half what Veo
 * cost. A paying account gets Kling, which is what they are paying for. Veo
 * and Wan are deactivated for now (migration 0130); Gemini Omni stays live as
 * a paid-tier backup alongside Kling rather than a second workhorse.
 */
const WORKHORSE: Readonly<Record<PlanId, string>> = {
  free: "bytedance/seedance-1.5-pro",
  creator: "kling-3.0/video",
  studio: "kling-3.0/video",
};

/** Footage to transform rather than a scene to invent. */
const MOTION =
  /\b(motion.?(control|transfer)|match the (movement|motion)|same (camera )?move|reenact|copy the (movement|motion))\b/i;

/**
 * Asked for a change to the footage rather than a new look for it.
 *
 * Restyle repaints a whole clip; video edit alters something inside one and
 * keeps the rest. They read almost the same in a sentence, so the distinction
 * is the verb: replacing, removing or adding a thing is an edit, and anything
 * else about attached footage is a restyle.
 */
const EDIT =
  /\b(edit|change|replace|swap|remove|delete|take out|put (a|an|the)|add (a|an|the)|outfit|background)\b/i;

/** Asked for length, which is the one thing Seedance is here for. */
const LONG_FORM = /\b(long(er)?[- ]?form|full length|30 ?s|45 ?s|60 ?s|a minute|minute[- ]long)\b/i;

const REFERENCE_TO_VIDEO =
  /\b(reference|character consistency|keep (the )?(person|subject|character) consistent)\b/i;

export interface SelectionInput {
  readonly prompt: string;
  readonly mode?: "auto" | "low" | "middle" | "high";
  readonly plan: PlanId;
  /** True when a photo of a person and a voice clip were both attached. */
  readonly hasFaceAndVoice: boolean;
  /** True when a voice clip was attached, with or without a photo to pair it. */
  readonly hasVoice: boolean;
  /** True when existing footage was attached to be transformed. */
  readonly hasFootage: boolean;
  /** How many reference stills came with the turn, which two models read. */
  readonly referenceImages: number;
  readonly catalog: readonly CatalogModel[];
}

function usable(model: CatalogModel, plan: PlanId): boolean {
  return model.isActive && (RANK[plan] ?? 0) >= (RANK[model.minPlan] ?? 0);
}

/** The best of `ids` this plan can actually run, in the order given. */
function firstUsable(
  ids: readonly string[],
  catalog: readonly CatalogModel[],
  plan: PlanId,
): CatalogModel | null {
  for (const id of ids) {
    const model = catalog.find((entry) => entry.id === id);
    if (model && usable(model, plan)) return model;
  }
  return null;
}

export function selectModel(input: SelectionInput): ModelChoice | null {
  const { prompt, plan, hasFaceAndVoice, hasVoice, hasFootage, referenceImages, catalog } = input;

  const workhorse = firstUsable(
    // Falls back down the list rather than failing: a plan whose workhorse is
    // inactive still gets a video. Veo is left off this list on purpose: it is
    // deactivated in the catalogue (migration 0130), so keeping it here would
    // only ever fall through to a model that can never be usable.
    [WORKHORSE[plan], "kling-3.0/video", "bytedance/seedance-1.5-pro", "gemini-omni-video"],
    catalog,
    plan,
  );

  // A clip with no face to put it on cannot be spoken by anything here, and
  // which model is picked does not change that, so it is judged once.
  const voiceIgnored = hasVoice && !hasFaceAndVoice;

  const pick = (
    model: CatalogModel | null,
    reason: string,
    attachmentIgnored = false,
  ): ModelChoice | null =>
    model === null
      ? null
      : {
          modelId: model.id,
          creditCost: model.creditCost,
          reason,
          // Only against what they would otherwise have paid. The same model is
          // remarkable on one plan and ordinary on another. An explicit mode is
          // already the user's confirmation, so only Auto asks again.
          worthConfirming:
            (input.mode ?? "auto") === "auto" && model.creditCost > (workhorse?.creditCost ?? 0),
          attachmentIgnored,
          voiceIgnored,
          alternative:
            workhorse === null ? null : { modelId: workhorse.id, creditCost: workhorse.creditCost },
        };

    const mode = input.mode ?? "auto";
    if (mode !== "auto" && !hasFaceAndVoice && !hasFootage) {
      const eligible = catalog.filter((model) => usable(model, plan));
      const ordered = [...eligible].sort((left, right) => left.creditCost - right.creditCost);
      const target =
        mode === "low"
          ? firstUsable(["bytedance/seedance-1.5-pro"], catalog, plan)
          : mode === "high"
            ? ordered.at(-1) ?? null
            : ordered[Math.floor((ordered.length - 1) / 2)] ?? null;
      if (target) return pick(target, `You selected ${mode} quality.`);
    }

  /*
   * Order matters, and it is by how specific the evidence is.
   *
   * A face with a voice can only be served by an avatar model, and footage to
   * transform can only be served by motion control. Those are facts about the
   * request. Everything after them is a preference, so they come first.
   */
  if (hasFaceAndVoice) {
    return pick(
      firstUsable(["kling/ai-avatar-pro", "kling/ai-avatar-standard"], catalog, plan),
      "You attached a photo and a voice clip, so this speaks in your voice.",
    );
  }

  /*
   * Footage with no motion request is a restyle rather than a transfer.
   *
   * Reached only once `wan/2-6-video-to-video` is active, which it is not: its
   * request shape is inferred from its siblings rather than confirmed, and
   * being wrong costs thirty credits an attempt. `firstUsable` skips inactive
   * models, so this falls through to the workhorse until somebody turns it on.
   */
  /*
   * Footage, from the most specific reading of it to the least.
   *
   * Motion first, because carrying a performance across is a different job from
   * anything done to the clip itself. Then an edit, which changes something
   * inside the footage and keeps the rest. Restyle is last of the three because
   * it is what "do something to this video" means when nothing narrower fits,
   * and it used to sit first and swallow the other two.
   */
  if (hasFootage && MOTION.test(prompt)) {
    const motion = firstUsable(["kling-3.0/motion-control"], catalog, plan);
    // Not available on this plan is not a reason to fail: the workhorse can
    // still make something from the same brief, it just will not transfer the
    // movement.
    if (motion) return pick(motion, "You asked to carry the movement across from your footage.");
  }

  if (hasFootage && referenceImages > 0 && REFERENCE_TO_VIDEO.test(prompt)) {
    const reference = firstUsable(["wan/2-7-r2v"], catalog, plan);
    if (reference) {
      return pick(
        reference,
        "You attached a reference video and images, so this keeps the subject consistent.",
      );
    }
  }

  if (hasFootage && EDIT.test(prompt)) {
    const edit = firstUsable(["wan/2-7-videoedit"], catalog, plan);
    if (edit) return pick(edit, "You asked to change something in the footage you attached.");
  }

  if (hasFootage) {
    const restyle = firstUsable(["wan/2-6-video-to-video"], catalog, plan);
    if (restyle) return pick(restyle, "You attached footage, so this restyles what you sent.");
  }

  /*
   * Several stills of the same subject is the one request that needs a model
   * built to hold a character steady across references. One still is an
   * ordinary image to video, which the workhorse already does.
   */
  if (referenceImages >= 2) {
    const consistent = firstUsable(["wan/2-7-r2v"], catalog, plan);
    if (consistent) {
      return pick(
        consistent,
        "You attached several references, so this keeps the subject consistent.",
      );
    }
  }

  if (LONG_FORM.test(prompt)) {
    const seedance = firstUsable(["bytedance/seedance-1.5-pro"], catalog, plan);
    if (seedance) return pick(seedance, "You asked for something longer, which this handles best.");
  }

  // Reached with footage attached only when nothing above could use it: the
  // restyle model is inactive, or motion was asked for but is not usable on
  // this plan. Either way the attachment is about to be dropped silently, and
  // the caller needs to say so rather than generate as if nothing was sent.
  return pick(workhorse, "The everyday generator for your plan.", hasFootage);
}
