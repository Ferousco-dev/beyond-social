import { type ModelChoice } from "./select-model";

/**
 * Asking before a costlier model is used.
 *
 * `selectModel` already flags a choice that costs more than the plan's everyday
 * generator. Nothing acted on that flag: the turn logged it and ran the
 * workhorse instead, which meant motion transfer and the avatar models were
 * selected and then never used by anybody. The alternative, running them
 * quietly, is a sixty credit charge somebody meets afterwards.
 *
 * So it is asked. This is the rule for when, and what the answer resolves to.
 * Pure, and free of `server-only`, because the card that renders the question
 * has to agree with the turn that asked it.
 */

/** What the user is being asked to approve, priced against what it replaces. */
export interface ModelUpgrade {
  readonly modelId: string;
  /** Why this model, in terms of what they asked for. */
  readonly reason: string;
  readonly creditCost: number;
  /** What the everyday model would cost for the same brief. */
  readonly alternativeCost: number;
  /** Their balance when they were asked, so the choice is made informed. */
  readonly balance: number;
}

/** The answer, naming the model it answers about. */
export interface ModelAnswer {
  readonly modelId: string;
  readonly accepted: boolean;
}

/**
 * Whether this turn has to stop and ask.
 *
 * `answered` bounds the exchange to a single round, exactly as `clarified`
 * does for the clarifying questions: a turn that comes back with an answer is
 * never asked again, whatever the answer was and whether or not it matched.
 * Without that a client which dropped the field would loop.
 */
export function shouldAskAboutModel(input: {
  readonly choice: ModelChoice | null;
  /** True when a stored preference already settled it, so there is no choice. */
  readonly hasPreference: boolean;
  /** False for a question or a greeting, which spend nothing to answer. */
  readonly wantsVideo: boolean;
  readonly answered: boolean;
}): boolean {
  const { choice, hasPreference, wantsVideo, answered } = input;
  if (hasPreference || answered || !wantsVideo) return false;
  return choice !== null && choice.worthConfirming;
}

/**
 * Which model the turn runs, once the question is settled.
 *
 * The answer names the model it approves, and it is honoured only when this
 * turn's own selection landed on that same model. The client is echoing back
 * something the server said; treating it as the model to run would let any
 * caller name the sixty credit one. The plan and balance gate still runs after
 * this either way, so this decides what is asked for, never what is allowed.
 *
 * Declining runs the plan's everyday generator, which is the model whose price
 * was quoted as the alternative, so what was offered is what gets made.
 */
export function modelToRun(
  choice: ModelChoice | null,
  answer: ModelAnswer | undefined,
): string | null {
  if (choice === null) return null;
  if (!choice.worthConfirming) return choice.modelId;

  return answer?.accepted === true && answer.modelId === choice.modelId
    ? choice.modelId
    : (choice.alternative?.modelId ?? null);
}

/** The question, or null when there is nothing costlier on offer. */
export function upgradeFrom(choice: ModelChoice, balance: number): ModelUpgrade | null {
  if (choice.alternative === null) return null;

  return {
    modelId: choice.modelId,
    reason: choice.reason,
    creditCost: choice.creditCost,
    alternativeCost: choice.alternative.creditCost,
    balance,
  };
}

/** "1 credit", "60 credits". Used in the card and in what it is labelled. */
export function creditWord(count: number): string {
  return `${count} credit${count === 1 ? "" : "s"}`;
}
