/**
 * Fitting a prompt into a model's window on purpose.
 *
 * A prompt is assembled from parts that arrive from different places and have
 * very different value: the instructions that define the task, what is known
 * about the person, a summary of the thread, the last few turns, retrieved
 * craft knowledge, and the message itself. Each part was bounded on its own, by
 * a count of messages or a slice of characters, and nothing bounded the total.
 *
 * Bounding the parts separately does not bound the whole, and character slices
 * do not measure what the window is denominated in. The failure that produces
 * is not a crash: it is a prompt that quietly grows until it is expensive, or
 * until the least important thing in it has pushed out the most important.
 *
 * So the caller states what the parts are worth, and this decides what fits.
 */
import { estimateTokens } from "./tokens";
import { type ModelSpec } from "./models";

export interface ContextSection {
  /** Identifies the section in the result, for logging and tests. */
  readonly name: string;
  readonly text: string;
  /**
   * What this is worth relative to the others. Higher survives; the lowest is
   * given up first. Ties are broken by the order the caller listed them in.
   */
  readonly priority: number;
  /**
   * Never dropped and never shortened.
   *
   * For the parts without which the request is meaningless rather than merely
   * worse: the task instructions, and the message being answered. A prompt that
   * cannot fit these does not need trimming, it needs a bigger model, and
   * silently answering a truncated question is worse than saying so.
   */
  readonly required?: boolean;
  /**
   * May be shortened to fit rather than dropped entirely.
   *
   * Right for prose that degrades gradually, like a summary or a transcript,
   * where half is most of the value. Wrong for a list of discrete facts, where
   * half of one is a sentence that stops mid-claim, so those are dropped whole.
   */
  readonly truncable?: boolean;
}

export type SectionOutcome = "full" | "truncated" | "dropped";

export interface PackedSection {
  readonly name: string;
  readonly text: string;
  readonly tokens: number;
  readonly outcome: SectionOutcome;
}

export interface PackedContext {
  readonly sections: readonly PackedSection[];
  /** Tokens the kept sections come to. */
  readonly tokens: number;
  readonly budgetTokens: number;
  /** True when anything was shortened or given up, which is worth logging. */
  readonly trimmed: boolean;
}

/** Raised when the parts that cannot be given up do not fit on their own. */
export class ContextTooLargeError extends Error {
  constructor(
    readonly requiredTokens: number,
    readonly budgetTokens: number,
  ) {
    super(
      `Required context is ${requiredTokens} tokens, which exceeds the ${budgetTokens} available`,
    );
    this.name = "ContextTooLargeError";
  }
}

/**
 * What is left for the prompt once the answer has its room.
 *
 * The two share one window, so a budget that ignores the completion is not a
 * budget. The margin matches the one the gateway applies at dispatch, so a
 * prompt packed to this size is not then rejected by the window check for being
 * a few tokens over.
 */
export function contextBudget(spec: ModelSpec, reservedOutput: number, margin = 1.15): number {
  const usable = spec.contextWindow - Math.min(reservedOutput, spec.maxOutput);
  return Math.max(0, Math.floor(usable / margin));
}

/**
 * The longest prefix of `text` that fits in `maxTokens`.
 *
 * Cut back to a paragraph, then a sentence, then a word boundary, in that
 * order, because a section that stops mid-word reads as corruption rather than
 * as an abridgement and invites the model to complete the fragment.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  if (maxTokens <= 0) return "";
  if (estimateTokens(text) <= maxTokens) return text;

  // Characters per token on this specific text, which is a far better starting
  // guess than any constant: the ratio differs by several times between English
  // prose, JSON and non-Latin scripts.
  const ratio = text.length / Math.max(1, estimateTokens(text));
  let end = Math.min(text.length, Math.floor(maxTokens * ratio));

  // Shrink until it fits. Converges in a couple of passes from that start.
  while (end > 0 && estimateTokens(text.slice(0, end)) > maxTokens) {
    end = Math.floor(end * 0.9);
  }
  if (end <= 0) return "";

  const head = text.slice(0, end);
  for (const boundary of ["\n\n", ". ", " "]) {
    const at = head.lastIndexOf(boundary);
    // Only honoured when it does not throw most of the section away, since a
    // section with one very long paragraph has no useful break to fall back to.
    if (at > end * 0.6) return head.slice(0, at + (boundary === " " ? 0 : boundary.length)).trim();
  }
  return head.trim();
}

/**
 * Fits the sections into the budget, giving up the least valuable first.
 *
 * Sections keep the order the caller listed them in, whatever order they were
 * dropped in: the arrangement of a prompt is the caller's decision, and this
 * only decides what survives.
 */
export function packContext(
  sections: readonly ContextSection[],
  budgetTokens: number,
): PackedContext {
  const measured = sections.map((section, index) => ({
    section,
    index,
    tokens: estimateTokens(section.text),
  }));

  const requiredTokens = measured
    .filter((entry) => entry.section.required)
    .reduce((total, entry) => total + entry.tokens, 0);
  if (requiredTokens > budgetTokens) {
    throw new ContextTooLargeError(requiredTokens, budgetTokens);
  }

  const outcomes = new Map<number, PackedSection>();
  let spent = requiredTokens;

  for (const entry of measured) {
    if (!entry.section.required) continue;
    outcomes.set(entry.index, {
      name: entry.section.name,
      text: entry.section.text,
      tokens: entry.tokens,
      outcome: "full",
    });
  }

  // Most valuable first, so what is kept is decided by worth rather than by
  // whichever section the caller happened to list earliest.
  const optional = measured
    .filter((entry) => !entry.section.required)
    .sort((a, b) => b.section.priority - a.section.priority || a.index - b.index);

  for (const entry of optional) {
    const remaining = budgetTokens - spent;
    const empty: PackedSection = {
      name: entry.section.name,
      text: "",
      tokens: 0,
      outcome: "dropped",
    };

    if (entry.tokens <= remaining) {
      outcomes.set(entry.index, {
        name: entry.section.name,
        text: entry.section.text,
        tokens: entry.tokens,
        outcome: "full",
      });
      spent += entry.tokens;
      continue;
    }

    if (!entry.section.truncable) {
      outcomes.set(entry.index, empty);
      continue;
    }

    const shortened = truncateToTokens(entry.section.text, remaining);
    if (shortened === "") {
      outcomes.set(entry.index, empty);
      continue;
    }
    const tokens = estimateTokens(shortened);
    outcomes.set(entry.index, {
      name: entry.section.name,
      text: shortened,
      tokens,
      outcome: "truncated",
    });
    spent += tokens;
  }

  const packed = measured.map((entry) => outcomes.get(entry.index) as PackedSection);
  return {
    sections: packed,
    tokens: spent,
    budgetTokens,
    trimmed: packed.some((section) => section.outcome !== "full"),
  };
}
