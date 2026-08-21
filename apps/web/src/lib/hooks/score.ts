/**
 * Rule-based scoring for an opening line, before a credit is spent on it.
 *
 * No model call: the signals a hook actually needs, a curiosity gap, a
 * concrete number, a question, an emotion word, are cheap enough to check with
 * a handful of regexes, and every one of them can run between a keystroke and
 * a render rather than adding a round trip to either. This is a lower bound on
 * quality, not a verdict: it catches "here is a video about our product",
 * which nobody clicks, and stays quiet about everything above that, which is
 * exactly the range where a hook lives or dies on judgement this cannot make.
 */

export interface HookSignal {
  readonly label: string;
  readonly present: boolean;
}

export interface HookScore {
  /** 0 to 100. A rough floor, not a ranking between two decent hooks. */
  readonly score: number;
  readonly signals: readonly HookSignal[];
  /** Concrete, fixable problems. Empty for anything that clears the bar. */
  readonly flags: readonly string[];
}

/**
 * Curiosity-gap and pattern-interrupt phrasing: the line withholds something
 * and promises to close the gap, which is what makes a scroll stop rather
 * than continue.
 */
const CURIOSITY =
  /\b(nobody tells you|here'?s why|the real reason|what nobody|no one talks about|until you|before you|the truth about|what i wish|turns out|secretly|the one thing)\b/i;

/** Directly invites an answer, which is the cheapest way to open a loop. */
const QUESTION = /\?\s*$|^\s*(why|what|how|who|when|which|do you|did you|have you|are you)\b/i;

/** Concrete numbers read as evidence; a hook with one is rarely vague. */
const NUMBER = /\b\d+([.,]\d+)?\b/;

/** Words that carry charge on their own, independent of what surrounds them. */
const POWER_WORDS =
  /\b(secret|never|always|shocking|nobody|everyone|mistake|warning|stop|wrong|truth|hack|free|proven|guaranteed|instantly|banned|illegal|dangerous|worst|best|finally)\b/i;

/** Names a feeling directly rather than describing a neutral fact. */
const EMOTION_WORDS =
  /\b(shocked|shocking|terrified|obsessed|furious|heartbroken|thrilled|devastated|embarrassing|humiliating|scared|afraid|excited|amazed)\b/i;

/**
 * Openers that read as throat-clearing rather than a hook: a greeting, a
 * disclosure of what the video is, or a first-person announcement. None of
 * these are wrong to say eventually; none of them belong in the first line.
 */
const WEAK_OPENER =
  /^\s*(hi|hey|hello|welcome|so today|in this video|today (i'?m|we'?re)|this is a video about)\b/i;

interface WeightedSignal {
  readonly label: string;
  readonly test: RegExp;
  readonly weight: number;
}

const SIGNALS: readonly WeightedSignal[] = [
  { label: "Opens a curiosity gap", test: CURIOSITY, weight: 30 },
  { label: "Asks a question", test: QUESTION, weight: 20 },
  { label: "Names a feeling", test: EMOTION_WORDS, weight: 20 },
  { label: "Uses a charged word", test: POWER_WORDS, weight: 15 },
  { label: "Gives a concrete number", test: NUMBER, weight: 15 },
];

/** Below this many words, there is rarely enough to hook with. */
const MIN_WORDS = 3;
/** Past this, it reads as a paragraph rather than an opening line. */
const MAX_WORDS = 28;

export function scoreHook(text: string): HookScore {
  const trimmed = text.trim();
  const words = trimmed.length === 0 ? [] : trimmed.split(/\s+/);

  const signals = SIGNALS.map((signal) => ({
    label: signal.label,
    present: signal.test.test(trimmed),
  }));

  const score = signals.reduce(
    (sum, signal, index) => sum + (signal.present ? SIGNALS[index]!.weight : 0),
    0,
  );

  const flags: string[] = [];
  if (words.length === 0) flags.push("There is no line to score yet.");
  if (words.length > 0 && words.length < MIN_WORDS) flags.push("Too short to hook with.");
  if (words.length > MAX_WORDS) flags.push("Reads as a paragraph, not an opening line.");
  if (WEAK_OPENER.test(trimmed))
    flags.push('Opens with a greeting or "in this video" instead of the hook.');
  if (words.length >= MIN_WORDS && !signals.some((signal) => signal.present)) {
    flags.push(
      "No curiosity, question, emotion, or number: nothing here earns a second of attention.",
    );
  }

  return { score: Math.min(100, score), signals, flags };
}
