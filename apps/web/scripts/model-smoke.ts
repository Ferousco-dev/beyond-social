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
  { id: "veo3_fast", creditCost: 6, minPlan: "free", capabilities: [], isActive: true },
  {
    id: "bytedance/seedance-1.5-pro",
    creditCost: 3,
    minPlan: "free",
    capabilities: [],
    isActive: true,
  },
  { id: "kling-3.0/video", creditCost: 30, minPlan: "free", capabilities: [], isActive: true },
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
  extra: { hasFaceAndVoice?: boolean; hasFootage?: boolean } = {},
) =>
  selectModel({
    prompt,
    plan,
    hasFaceAndVoice: extra.hasFaceAndVoice ?? false,
    hasFootage: extra.hasFootage ?? false,
    catalog: CATALOG,
  });

{
  const out = choose("a video about my coffee shop", "free");
  check(
    "a free account gets Veo, the cheap tier's workhorse",
    out?.modelId === "veo3_fast" && out.creditCost === 6,
    `${out?.modelId} ${out?.creditCost}cr`,
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
    out?.modelId === "veo3_fast",
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
    out?.modelId === "veo3_fast",
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
    hasFootage: false,
    catalog: [],
  });
  check("an empty catalogue returns nothing rather than guessing", empty === null, String(empty));
}

{
  const offline = CATALOG.map((model) =>
    model.id === "veo3_fast" ? { ...model, isActive: false } : model,
  );
  const out = selectModel({
    prompt: "anything",
    plan: "free",
    hasFaceAndVoice: false,
    hasFootage: false,
    catalog: offline,
  });
  check(
    "an inactive workhorse falls through to one that is running",
    out?.modelId === "kling-3.0/video",
    out?.modelId ?? "none",
  );
}

{
  // Footage with no motion request is a restyle. Inactive today, so it must
  // fall through rather than pick a model nothing can dispatch.
  const out = choose("make this look like film", "studio", { hasFootage: true });
  check(
    "footage without a motion request does not pick an inactive restyle model",
    out?.modelId === "kling-3.0/video",
    out?.modelId ?? "none",
  );
}

{
  // And once it is switched on, it is what footage should reach.
  const withRestyle = [
    ...CATALOG,
    {
      id: "wan/2-6-video-to-video",
      creditCost: 30,
      minPlan: "studio" as const,
      capabilities: [],
      isActive: true,
    },
  ];
  const out = selectModel({
    prompt: "make this look like film",
    plan: "studio",
    hasFaceAndVoice: false,
    hasFootage: true,
    catalog: withRestyle,
  });
  check(
    "an active restyle model is what footage reaches",
    out?.modelId === "wan/2-6-video-to-video",
    out?.modelId ?? "none",
  );
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
