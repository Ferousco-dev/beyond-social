/**
 * Evaluation set for the intent classifier.
 *
 * The classifier decides whether a message makes a video, changes one, or is
 * answered in words. Getting it wrong is expensive in both directions: a missed
 * `create` makes the product look broken, and a false `create` spends someone's
 * credit on a video they did not ask for.
 *
 * There is no fine-tuning here, so "training" means measuring against labelled
 * cases and changing the prompt until the numbers move. Without this file every
 * prompt change is a guess that feels better.
 *
 *   supabase start && tsx --tsconfig scripts/tsconfig.json scripts/intent-eval.ts
 *
 * Cases are drawn from real product use, including the one that started this:
 * a message beginning with the word "Generate" was classified as a question.
 */
import { execFileSync } from "node:child_process";

const status = execFileSync("supabase", ["status", "-o", "env"], {
  cwd: new URL("../../../", import.meta.url).pathname,
  encoding: "utf8",
});
for (const line of status.split("\n")) {
  const match = /^([A-Z0-9_]+)="?([^"]*)"?$/.exec(line.trim());
  const [, key, value] = match ?? [];
  if (key !== undefined) process.env[key] = value ?? "";
}

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.API_URL ?? "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.PUBLISHABLE_KEY ?? "";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SECRET_KEY ?? "";

const { classify } = await import("../src/lib/generation/intent");

interface Case {
  readonly message: string;
  readonly expect: "create" | "adjust" | "ask";
  /** Whether a video already exists in the conversation. */
  readonly hasPrevious: boolean;
  /** Why this case exists, when it is not obvious. */
  readonly note?: string;
}

const CASES: readonly Case[] = [
  // Explicit creation. Failing any of these makes the product look broken.
  { message: "Generate a 9:16 shot of a matte black wristwatch resting on wet slate at dawn. Start wide, then push in slowly on the crown as the light shifts across it. Cool blue tones, shallow depth of field, no text.", expect: "create", hasPrevious: false, note: "the message that exposed the bug" },
  { message: "Make me a video of a coffee cup on a marble counter", expect: "create", hasPrevious: false },
  { message: "A 6 second vertical clip of trail shoes on a wet forest path", expect: "create", hasPrevious: false },
  { message: "Create a short ad for our new running shoe", expect: "create", hasPrevious: false },
  { message: "product shot, white ceramic mug, morning light, slow orbit", expect: "create", hasPrevious: false, note: "terse, no verb at all" },
  { message: "I need something for TikTok showing the watch in the rain", expect: "create", hasPrevious: false },
  { message: "Generate another one, this time with the shoe on sand", expect: "create", hasPrevious: true, note: "new subject, so not an adjustment" },

  // Adjustments to an existing video.
  { message: "make it slower", expect: "adjust", hasPrevious: true },
  { message: "can you make the lighting warmer", expect: "adjust", hasPrevious: true, note: "phrased as a question but wants a change" },
  { message: "hold on the crown a bit longer", expect: "adjust", hasPrevious: true },
  { message: "try it in 16:9", expect: "adjust", hasPrevious: true },
  { message: "remove the text overlay", expect: "adjust", hasPrevious: true },

  // Questions and conversation. A false create here spends a credit.
  { message: "what shutter speed would suit this?", expect: "ask", hasPrevious: true },
  { message: "which aspect ratio works best on Instagram?", expect: "ask", hasPrevious: false },
  { message: "how many credits does a video cost?", expect: "ask", hasPrevious: false },
  { message: "hmm nice i gues", expect: "ask", hasPrevious: true, note: "a throwaway remark, not a brief" },
  { message: "thanks", expect: "ask", hasPrevious: true },
  { message: "why does the push-in look jittery?", expect: "ask", hasPrevious: true },
  { message: "I always shoot vertical, my whole audience is on TikTok", expect: "ask", hasPrevious: true, note: "states a preference, does not ask for a video" },
  { message: "what can you do?", expect: "ask", hasPrevious: false },
];

const results: { c: Case; got: string; confidence: number }[] = [];

for (const c of CASES) {
  const out = await classify(c.message, c.hasPrevious);
  results.push({ c, got: out.intent, confidence: out.confidence });
}

const wrong = results.filter((r) => r.got !== r.c.expect);

for (const r of results) {
  const mark = r.got === r.c.expect ? "  ok  " : "  FAIL";
  const detail = r.got === r.c.expect ? "" : `  expected ${r.c.expect}, got ${r.got}`;
  process.stdout.write(
    `${mark} [${r.c.expect}] ${r.c.message.slice(0, 58).padEnd(58)}${detail}\n`,
  );
}

// Broken out because the two directions have different costs: a missed create
// looks like a broken product, a false create spends someone's money.
const missedCreate = wrong.filter((r) => r.c.expect === "create").length;
const falseCreate = wrong.filter((r) => r.got === "create" && r.c.expect === "ask").length;

process.stdout.write(
  `\n${results.length - wrong.length}/${results.length} correct` +
    `\n  missed creates (product looks broken): ${missedCreate}` +
    `\n  false creates (spends a credit):       ${falseCreate}\n`,
);

if (wrong.length > 0) process.exitCode = 1;
