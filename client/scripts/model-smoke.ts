/**
 * Behaviour checks for model selection. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/model-smoke.ts
 *
 * This decides what an account is charged, so the cases that matter are the
 * ones where it could quietly cost somebody twenty times what they expected, or
 * pick a model their plan cannot run.
 *
 * The catalogue below is the live one, copied at the costs production actually
 * bills, so a change to those prices should break these on purpose.
 */
import { selectModel, type CatalogModel } from "../src/lib/generation/select-model";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const CATALOG: readonly CatalogModel[] = [
  // Deactivated by migration 0130: Kling-first, Veo and Wan retired for now.
  // Kept here, inactive, for the same reason the migration deactivates rather
  // than deletes: these are the rows a reactivation would flip back on.
  { id: "veo3_fast", creditCost: 6, minPlan: "free", capabilities: [], isActive: false },
  { id: "veo3_lite", creditCost: 3, minPlan: "free", capabilities: [], isActive: false },
  { id: "veo3", creditCost: 12, minPlan: "free", capabilities: [], isActive: false },
  {
    id: "wan/2-6-video-to-video",
    creditCost: 30,
    minPlan: "studio",
    capabilities: [],
    isActive: false,
  },
  {
    id: "wan/2-7-videoedit",
    creditCost: 30,
    minPlan: "studio",
    capabilities: [],
    isActive: false,
  },
  { id: "wan/2-7-r2v", creditCost: 30, minPlan: "studio", capabilities: [], isActive: false },
  {
    id: "bytedance/seedance-1.5-pro",
    creditCost: 3,
    minPlan: "free",
    capabilities: [],
    isActive: true,
  },
  { id: "gemini-omni-video", creditCost: 30, minPlan: "creator", capabilities: [], isActive: true },
  // creator-and-up since migration 0070; free plans route to Seedance instead.
  { id: "kling-3.0/video", creditCost: 30, minPlan: "creator", capabilities: [], isActive: true },
  {
    id: "kling-3.0/motion-control",
    creditCost: 60,
    minPlan: "studio",
    capabilities: [],
    isActive: true,
  },
  {
    id: "kling/ai-avatar-standard",
    creditCost: 12,
    minPlan: "free",
    capabilities: [],
    isActive: true,
  },
  {
    id: "kling/ai-avatar-pro",
    creditCost: 24,
    minPlan: "studio",
    capabilities: [],
    isActive: true,
  },
];

const choose = (
  prompt: string,
  plan: "free" | "creator" | "studio",
  extra: {
    mode?: "auto" | "low" | "middle" | "high";
    hasFaceAndVoice?: boolean;
    hasVoice?: boolean;
    hasFootage?: boolean;
    referenceImages?: number;
  } = {},
) =>
  selectModel({
    prompt,
    mode: extra.mode ?? "auto",
    plan,
    hasFaceAndVoice: extra.hasFaceAndVoice ?? false,
    // A face and a voice implies the voice, so the caller only has to say so
    // for the case that matters: a clip sent on its own.
    hasVoice: extra.hasVoice ?? extra.hasFaceAndVoice ?? false,
    hasFootage: extra.hasFootage ?? false,
    referenceImages: extra.referenceImages ?? 0,
    catalog: CATALOG,
  });

{
  const out = choose("a video about my coffee shop", "free");
  check(
    "a free account gets Seedance, the cheap tier's workhorse",
    out?.modelId === "bytedance/seedance-1.5-pro" && out.creditCost === 3,
    `${out?.modelId} ${out?.creditCost}cr`,
  );
}

{
  const out = choose("anything", "studio", { mode: "low" });
  check(
    "explicit low quality picks the cheap model over the plan's workhorse",
    out?.modelId === "bytedance/seedance-1.5-pro",
    out?.modelId ?? "none",
  );
}

{
  const out = choose("a video about my coffee shop", "studio");
  check(
    "a paying account gets Kling",
    out?.modelId === "kling-3.0/video" && out.creditCost === 30,
    `${out?.modelId} ${out?.creditCost}cr`,
  );
}

{
  // The workhorse is what they always pay, so it is never a surprise.
  const free = choose("anything", "free");
  const studio = choose("anything", "studio");
  check(
    "the everyday model never asks for confirmation",
    free?.worthConfirming === false && studio?.worthConfirming === false,
    `free=${free?.worthConfirming} studio=${studio?.worthConfirming}`,
  );
}

{
  const out = choose("say hello to the camera", "free", { hasFaceAndVoice: true });
  check(
    "a face and a voice pick the avatar model a free plan can run",
    out?.modelId === "kling/ai-avatar-standard" && out.creditCost === 12,
    `${out?.modelId} ${out?.creditCost}cr`,
  );
}

{
  const out = choose("say hello to the camera", "free", { hasFaceAndVoice: true });
  check(
    "an avatar costs more than the free workhorse, so it is confirmed",
    out?.worthConfirming === true,
    String(out?.worthConfirming),
  );
}

{
  const out = choose("say hello to the camera", "studio", { hasFaceAndVoice: true });
  check(
    "a studio plan gets the pro avatar",
    out?.modelId === "kling/ai-avatar-pro",
    out?.modelId ?? "none",
  );
}

{
  const out = choose("match the movement from this clip", "studio", { hasFootage: true });
  check(
    "footage plus a motion request picks motion control",
    out?.modelId === "kling-3.0/motion-control" && out.creditCost === 60,
    `${out?.modelId} ${out?.creditCost}cr`,
  );
}

{
  // Sixty credits against a studio workhorse of thirty. Nobody should meet that
  // number after the fact.
  const out = choose("match the movement from this clip", "studio", { hasFootage: true });
  check(
    "motion control is always confirmed",
    out?.worthConfirming === true,
    String(out?.worthConfirming),
  );
}

{
  /*
   * A free plan cannot run motion control. Falling back to the workhorse is the
   * right answer: the same brief still makes a video, it just does not transfer
   * the movement. Failing outright would be worse.
   */
  const out = choose("match the movement from this clip", "free", { hasFootage: true });
  check(
    "a plan that cannot run motion control still gets a video",
    out?.modelId === "bytedance/seedance-1.5-pro",
    out?.modelId ?? "none",
  );
}

{
  const out = choose("a minute-long tour of the property", "free");
  check(
    "a request for length picks Seedance",
    out?.modelId === "bytedance/seedance-1.5-pro",
    out?.modelId ?? "none",
  );
}

{
  // Cheaper than the workhorse, so there is nothing to warn about.
  const out = choose("a minute-long tour of the property", "free");
  check(
    "a cheaper model is never confirmed",
    out?.worthConfirming === false,
    `${out?.creditCost}cr confirming=${out?.worthConfirming}`,
  );
}

{
  // "long" inside another word must not trigger it.
  const out = choose("a video of a long haired cat", "free");
  check(
    "a word boundary keeps a substring from changing the model",
    out?.modelId === "bytedance/seedance-1.5-pro",
    out?.modelId ?? "none",
  );
}

{
  // Attachments beat wording: this says motion, but nothing was attached.
  const out = choose("match the movement of a dancer", "studio", { hasFootage: false });
  check(
    "a motion request with no footage stays on the workhorse",
    out?.modelId === "kling-3.0/video",
    out?.modelId ?? "none",
  );
}

{
  const empty = selectModel({
    prompt: "anything",
    plan: "free",
    hasFaceAndVoice: false,
    hasVoice: false,
    hasFootage: false,
    referenceImages: 0,
    catalog: [],
  });
  check("an empty catalogue returns nothing rather than guessing", empty === null, String(empty));
}

{
  // Seedance is the free tier's only usable model in this catalogue: Kling
  // and Gemini Omni are both creator-and-up. Switching it off leaves a free
  // plan with nothing it can run, and that has to come back as nothing rather
  // than a model the account cannot afford.
  const offline = CATALOG.map((model) =>
    model.id === "bytedance/seedance-1.5-pro" ? { ...model, isActive: false } : model,
  );
  const out = selectModel({
    prompt: "anything",
    plan: "free",
    hasFaceAndVoice: false,
    hasVoice: false,
    hasFootage: false,
    referenceImages: 0,
    catalog: offline,
  });
  check(
    "a free plan with its only workhorse switched off gets nothing rather than a plan it cannot run",
    out === null,
    String(out),
  );
}

{
  // The same outage on a paying plan is not a dead end: Kling is still there.
  const offline = CATALOG.map((model) =>
    model.id === "kling-3.0/video" ? { ...model, isActive: false } : model,
  );
  const out = selectModel({
    prompt: "anything",
    plan: "studio",
    hasFaceAndVoice: false,
    hasVoice: false,
    hasFootage: false,
    referenceImages: 0,
    catalog: offline,
  });
  check(
    "a paying plan's inactive workhorse falls through to the other backup",
    out?.modelId === "bytedance/seedance-1.5-pro" || out?.modelId === "gemini-omni-video",
    out?.modelId ?? "none",
  );
}

{
  /*
   * Restyle is active now that its request shape has been read rather than
   * inferred, so this no longer asserts that footage falls past it. What still
   * has to hold is the rule underneath: a model that cannot be dispatched is
   * never chosen, whichever model that happens to be this month.
   */
  const withoutRestyle = CATALOG.map((model) =>
    model.id === "wan/2-6-video-to-video" ? { ...model, isActive: false } : model,
  );
  const out = selectModel({
    prompt: "make this look like film",
    plan: "studio",
    hasFaceAndVoice: false,
    hasVoice: false,
    hasFootage: true,
    referenceImages: 0,
    catalog: withoutRestyle,
  });
  check(
    "footage falls past a restyle model that is switched off",
    out?.modelId === "kling-3.0/video",
    out?.modelId ?? "none",
  );
}

{
  // And once it is switched on, it is what footage should reach.
  const withRestyle = CATALOG.map((model) =>
    model.id === "wan/2-6-video-to-video" ? { ...model, isActive: true } : model,
  );
  const out = selectModel({
    prompt: "make this look like film",
    plan: "studio",
    hasFaceAndVoice: false,
    hasVoice: false,
    hasFootage: true,
    referenceImages: 0,
    catalog: withRestyle,
  });
  check(
    "an active restyle model is what footage reaches",
    out?.modelId === "wan/2-6-video-to-video",
    out?.modelId ?? "none",
  );
}

{
  // What a declined upgrade falls back to, and what the card quotes as the
  // ordinary price. Reading the wrong one would put a number on screen that is
  // not the one billed.
  const out = choose("match the movement from this clip", "studio", { hasFootage: true });
  check(
    "a costlier choice carries the everyday model it is priced against",
    out?.alternative?.modelId === "kling-3.0/video" && out.alternative.creditCost === 30,
    `${out?.alternative?.modelId} ${out?.alternative?.creditCost}cr`,
  );
}

{
  const out = choose("a video about my coffee shop", "free");
  check(
    "the everyday model is its own alternative, so declining is always answerable",
    out?.alternative?.modelId === "bytedance/seedance-1.5-pro",
    out?.alternative?.modelId ?? "none",
  );
}

{
  // Nothing in the catalogue speaks a clip without a face to put it on, so the
  // audio is dropped. It used to be dropped without a word.
  const out = choose("read this out for me", "free", { hasVoice: true });
  check(
    "a voice clip with no photo is reported as unusable",
    out?.voiceIgnored === true && out.modelId === "bytedance/seedance-1.5-pro",
    `${out?.modelId} voiceIgnored=${out?.voiceIgnored}`,
  );
}

{
  const out = choose("say hello to the camera", "free", { hasFaceAndVoice: true });
  check(
    "a voice paired with a face is used, so nothing is reported dropped",
    out?.voiceIgnored === false,
    String(out?.voiceIgnored),
  );
}

{
  const out = choose("a video about my coffee shop", "free");
  check(
    "no voice attached reports nothing about one",
    out?.voiceIgnored === false,
    String(out?.voiceIgnored),
  );
}

/*
 * Footage reads three ways and the order between them is the behaviour, not an
 * implementation detail. Restyle used to sit first and swallow both of the
 * narrower readings.
 */
check(
  "carrying a performance across beats editing it",
  choose("copy the movement onto her", "studio", { hasFootage: true })?.modelId ===
    "kling-3.0/motion-control",
  choose("copy the movement onto her", "studio", { hasFootage: true })?.modelId ?? "none",
);
/*
 * The three Wan reads (edit, restyle, multi-reference) are deactivated by
 * migration 0130, so each falls through to the workhorse today rather than to
 * Wan. The routing logic that would use them is unchanged and still worth
 * covering, so each also gets a second check on a catalogue with that one
 * model switched back on, the same way the restyle toggle above does.
 */
check(
  "an edit falls through to the workhorse while Wan is off",
  choose("replace the background with a beach", "studio", { hasFootage: true })?.modelId ===
    "kling-3.0/video",
  choose("replace the background with a beach", "studio", { hasFootage: true })?.modelId ?? "none",
);
{
  const withEdit = CATALOG.map((model) =>
    model.id === "wan/2-7-videoedit" ? { ...model, isActive: true } : model,
  );
  const out = selectModel({
    prompt: "replace the background with a beach",
    plan: "studio",
    hasFaceAndVoice: false,
    hasVoice: false,
    hasFootage: true,
    referenceImages: 0,
    catalog: withEdit,
  });
  check(
    "changing something inside the footage is an edit, once Wan is back on",
    out?.modelId === "wan/2-7-videoedit",
    out?.modelId ?? "none",
  );
}
check(
  "footage with no narrower reading falls through to the workhorse while Wan is off",
  choose("make it look like an anime", "studio", { hasFootage: true })?.modelId ===
    "kling-3.0/video",
  choose("make it look like an anime", "studio", { hasFootage: true })?.modelId ?? "none",
);
check(
  "several stills fall through to the workhorse while Wan is off",
  choose("her in a park", "studio", { referenceImages: 3 })?.modelId === "kling-3.0/video",
  choose("her in a park", "studio", { referenceImages: 3 })?.modelId ?? "none",
);
{
  const withReference = CATALOG.map((model) =>
    model.id === "wan/2-7-r2v" ? { ...model, isActive: true } : model,
  );
  const out = selectModel({
    prompt: "her in a park",
    plan: "studio",
    hasFaceAndVoice: false,
    hasVoice: false,
    hasFootage: false,
    referenceImages: 3,
    catalog: withReference,
  });
  check(
    "several stills ask for the model that holds a subject steady, once Wan is back on",
    out?.modelId === "wan/2-7-r2v",
    out?.modelId ?? "none",
  );
}
check(
  "one still is an ordinary generation, not a reference run",
  choose("her in a park", "studio", { referenceImages: 1 })?.modelId === "kling-3.0/video",
  choose("her in a park", "studio", { referenceImages: 1 })?.modelId ?? "none",
);

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
