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
}

/** Which plans outrank which, for the `min_plan` check. */
const RANK: Readonly<Record<PlanId, number>> = { free: 0, creator: 1, studio: 2 };

/**
 * The everyday generator for a plan.
 *
 * Veo stays the free tier's, which is the client's call rather than a technical
 * one: it is the cheapest way to let somebody try the product. A paying account
 * gets Kling, which is what they are paying for.
 */
const WORKHORSE: Readonly<Record<PlanId, string>> = {
  free: "veo3_fast",
  creator: "kling-3.0/video",
  studio: "kling-3.0/video",
};

/** Footage to transform rather than a scene to invent. */
const MOTION =
  /\b(motion.?(control|transfer)|match the (movement|motion)|same (camera )?move|reenact|copy the (movement|motion))\b/i;

/** Asked for length, which is the one thing Seedance is here for. */
const LONG_FORM = /\b(long(er)?[- ]?form|full length|30 ?s|45 ?s|60 ?s|a minute|minute[- ]long)\b/i;

export interface SelectionInput {
  readonly prompt: string;
  readonly plan: PlanId;
  /** True when a photo of a person and a voice clip were both attached. */
  readonly hasFaceAndVoice: boolean;
  /** True when existing footage was attached to be transformed. */
  readonly hasFootage: boolean;
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
  const { prompt, plan, hasFaceAndVoice, hasFootage, catalog } = input;

  const workhorse = firstUsable(
    // Falls back down the list rather than failing: a plan whose workhorse is
    // inactive still gets a video.
    [WORKHORSE[plan], "kling-3.0/video", "veo3_fast", "bytedance/seedance-1.5-pro"],
    catalog,
    plan,
  );

  const pick = (model: CatalogModel | null, reason: string): ModelChoice | null =>
    model === null
      ? null
      : {
          modelId: model.id,
          creditCost: model.creditCost,
          reason,
          // Only against what they would otherwise have paid. The same model is
          // remarkable on one plan and ordinary on another.
          worthConfirming: model.creditCost > (workhorse?.creditCost ?? 0),
        };

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

  if (hasFootage && MOTION.test(prompt)) {
    const motion = firstUsable(["kling-3.0/motion-control"], catalog, plan);
    // Not available on this plan is not a reason to fail: the workhorse can
    // still make something from the same brief, it just will not transfer the
    // movement.
    if (motion) return pick(motion, "You asked to carry the movement across from your footage.");
  }

  if (LONG_FORM.test(prompt)) {
    const seedance = firstUsable(["bytedance/seedance-1.5-pro"], catalog, plan);
    if (seedance) return pick(seedance, "You asked for something longer, which this handles best.");
  }

  return pick(workhorse, "The everyday generator for your plan.");
}
