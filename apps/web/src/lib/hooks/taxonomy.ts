/**
 * The named shapes a hook comes in.
 *
 * Read as free text, "why does every bakery lose orders" and "this is the
 * one bakery mistake nobody warns you about" are two sentences with nothing
 * in common to search, filter or ask for by name. Tagged against this list
 * they are both `curiosity_gap`, which is what makes "give me a shocking
 * claim instead" a request the idea refiner or the script compiler can act
 * on rather than a request that has no field to land in.
 *
 * Nine patterns, not an open set: a hook that fits none of them cleanly is
 * `other` rather than forcing a bad classification, which is worth keeping
 * honest since a wrong tag is worse than no tag for anything that reads it
 * back later, prompt-RAG accept/reject correlation foremost.
 */
export const HOOK_PATTERNS = [
  "curiosity_gap",
  "shocking_claim",
  "story_loop",
  "number_promise",
  "direct_question",
  "myth_busting",
  "relatable_problem",
  "before_after",
  "warning",
  "other",
] as const;

export type HookPattern = (typeof HOOK_PATTERNS)[number];

/** Named in a sentence, for the classifying prompt and for the UI badge alike. */
export const HOOK_PATTERN_LABELS: Readonly<Record<HookPattern, string>> = {
  curiosity_gap: "Curiosity gap",
  shocking_claim: "Shocking claim",
  story_loop: "Story loop",
  number_promise: "Number promise",
  direct_question: "Direct question",
  myth_busting: "Myth busting",
  relatable_problem: "Relatable problem",
  before_after: "Before / after",
  warning: "Warning",
  other: "Other",
};

/** One line each, for the prompt that has to classify against this list. */
export const HOOK_PATTERN_DESCRIPTIONS: Readonly<Record<HookPattern, string>> = {
  curiosity_gap:
    'Withholds something and promises to close the gap: "nobody tells you this about..."',
  shocking_claim: "Opens with a surprising or extreme statement to stop the scroll.",
  story_loop: 'Opens mid-story, resolution held back: "so this just happened..."',
  number_promise: 'Leads with a count: "3 mistakes", "in 10 seconds".',
  direct_question: "Opens by asking the viewer something directly.",
  myth_busting: "Names a common belief and says it is wrong.",
  relatable_problem: "States a problem the audience already recognises in themselves.",
  before_after: "Contrasts a before state against an after, implying transformation.",
  warning: "Opens by naming a risk or a mistake to avoid.",
  other: "Doesn't fit the above cleanly.",
};
