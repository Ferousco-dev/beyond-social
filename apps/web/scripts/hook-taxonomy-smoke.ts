/**
 * Behaviour check for the hook pattern taxonomy. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/hook-taxonomy-smoke.ts
 *
 * Two things worth getting wrong: an unrecognised or missing pattern from the
 * model has to fall back to `other` rather than fail the whole analysis, and
 * every pattern in the list needs a label and a description or the UI badge
 * and the classifying prompt silently go blank for it.
 */
import { postAnalysisSchema } from "../src/lib/tiktok/analyse";
import {
  HOOK_PATTERNS,
  HOOK_PATTERN_DESCRIPTIONS,
  HOOK_PATTERN_LABELS,
} from "../src/lib/hooks/taxonomy";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const base = {
  format: "Curiosity-driven product reveal",
  hook: "Nobody tells you this",
  structure: [],
  whyItWorks: "Opens a gap and closes it late",
  brief: "A short vertical video about a product nobody expected to work this well.",
  confidence: "low" as const,
};

check(
  "a listed pattern parses through unchanged",
  postAnalysisSchema.safeParse({ ...base, hookPattern: "curiosity_gap" }).success &&
    postAnalysisSchema.parse({ ...base, hookPattern: "curiosity_gap" }).hookPattern ===
      "curiosity_gap",
);

check(
  "an unrecognised pattern falls back to other, not a parse failure",
  postAnalysisSchema.parse({ ...base, hookPattern: "totally_made_up" }).hookPattern === "other",
);

check(
  "a missing pattern falls back to other",
  postAnalysisSchema.parse({ ...base }).hookPattern === "other",
);

check(
  "every pattern has a label",
  HOOK_PATTERNS.every(
    (pattern) =>
      typeof HOOK_PATTERN_LABELS[pattern] === "string" && HOOK_PATTERN_LABELS[pattern].length > 0,
  ),
);

check(
  "every pattern has a description",
  HOOK_PATTERNS.every(
    (pattern) =>
      typeof HOOK_PATTERN_DESCRIPTIONS[pattern] === "string" &&
      HOOK_PATTERN_DESCRIPTIONS[pattern].length > 0,
  ),
);

check("other is a valid fallback member of the list itself", HOOK_PATTERNS.includes("other"));

// `process.stdout` rather than `console`, matching the sibling smoke scripts
// and the lint rule that keeps `console` for warnings and errors.
process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
