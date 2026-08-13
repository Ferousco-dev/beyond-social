/**
 * Behaviour checks for generation intent and refinement.
 *
 * These cover the fail-safe paths, which are the ones that matter: with no
 * model configured the product must still make videos, and refinement must
 * refuse rather than return something that lost its subject.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/generation-smoke.ts
 */
import {
  ASPECT_RATIOS,
  INTENTS,
  SUPPORTED_DURATIONS,
  classify,
  isSupportedDuration,
} from "../src/lib/generation/intent";
import { refinePrompt } from "../src/lib/generation/refine";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

async function main(): Promise<void> {
  // The provider renders a fixed set of lengths. Anything else must be caught
  // here rather than silently becoming a different video than was asked for.
  check("accepts a supported duration", SUPPORTED_DURATIONS.every(isSupportedDuration));
  check("rejects 30 seconds", !isSupportedDuration(30));
  check("rejects 5 seconds", !isSupportedDuration(5));
  check("rejects zero", !isSupportedDuration(0));

  // No model is configured in this environment, so every call takes the
  // fallback path. That is exactly what needs proving: an unavailable
  // classifier must not turn the product into a chatbot that never makes
  // anything.
  {
    const first = await classify("Make a video of a trail running shoe", false);
    check("first message falls back to create", first.intent === "create", first.intent);
    check("fallback reports no confidence", first.confidence === 0);
    check("fallback invents no aspect ratio", first.aspectRatio === null);
    check("fallback invents no duration", first.durationSeconds === null);
  }
  {
    const later = await classify("make it slower", true);
    // With a previous video, the safe assumption is that they want it changed,
    // not that a brand new unrelated video should be made.
    check("later message falls back to adjust", later.intent === "adjust", later.intent);
  }
  {
    // A question still generates when the classifier is unavailable. That is
    // the deliberate trade: never silently doing nothing beats never spending.
    const question = await classify("which aspect ratio works best on TikTok?", false);
    check("unavailable classifier still generates", question.intent === "create", question.intent);
  }
  {
    const empty = await classify("   ", false);
    check("blank message does not crash", empty.intent === "create");
  }

  // Refinement must fail closed. Returning something for an empty base would
  // mean generating from a prompt with no subject, which is the exact bug this
  // replaced.
  check(
    "refuses an empty previous prompt",
    (await refinePrompt({ previousPrompt: "", change: "slower" })) === null,
  );
  check(
    "refuses an empty change",
    (await refinePrompt({ previousPrompt: "a shoe on wet rock", change: "  " })) === null,
  );
  check(
    "refuses when no model is configured",
    (await refinePrompt({ previousPrompt: "a shoe on wet rock", change: "make it slower" })) ===
      null,
  );

  // The vocabularies the classifier is allowed to return must stay in step with
  // what the rest of the pipeline accepts. `chat` joined them when small talk
  // stopped being answered as though a video were being made, and this was not
  // updated with it, so the suite has been one short since.
  check(
    "intents are the four the router handles",
    INTENTS.join(",") === "create,adjust,ask,chat",
    INTENTS.join(","),
  );
  check("aspect ratios match the edge function", ASPECT_RATIOS.join(",") === "16:9,9:16,Auto");

  process.stdout.write(
    `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
