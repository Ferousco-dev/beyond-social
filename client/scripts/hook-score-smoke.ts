/**
 * Behaviour check for the rule-based hook scorer. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/hook-score-smoke.ts
 *
 * This is a floor, not a ranking: the thing worth getting right is catching
 * the hook that says nothing, not ordering two decent ones against each other.
 */
import { scoreHook } from "../src/lib/hooks/score";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

{
  const weak = scoreHook("Hi guys, today I'm going to show you our new product");
  check("a greeting-first opener scores low", weak.score <= 20, `${weak.score}`);
  check(
    "a weak opener is flagged",
    weak.flags.some((f) => f.includes("greeting")),
  );
}

{
  const strong = scoreHook(
    "Nobody tells you this about a bakery website, and it's costing you 3 customers a week",
  );
  check("a curiosity gap plus a number scores high", strong.score >= 50, `${strong.score}`);
  check(
    "the curiosity signal is reported present",
    strong.signals.find((s) => s.label === "Opens a curiosity gap")?.present === true,
  );
}

{
  const question = scoreHook(
    "Why does every bakery website lose orders in the first three seconds?",
  );
  check("a question scores above zero", question.score > 0, `${question.score}`);
  check(
    "the question signal is reported present",
    question.signals.find((s) => s.label === "Asks a question")?.present === true,
  );
}

{
  const empty = scoreHook("   ");
  check("an empty line scores zero", empty.score === 0);
  check("an empty line is flagged", empty.flags.length > 0);
}

{
  const short = scoreHook("Wow");
  check(
    "a too-short line is flagged",
    short.flags.some((f) => f.includes("short")),
  );
}

{
  const long = scoreHook(
    "So in today's video I wanted to sit down and really walk you through everything that happened this week at the bakery, from the early morning prep all the way through to closing up shop",
  );
  check(
    "a paragraph-length line is flagged",
    long.flags.some((f) => f.includes("paragraph")),
  );
}

{
  const flat = scoreHook("This is a video about our bakery and what we sell here every day");
  check(
    "a hook with no signal at all is flagged",
    flat.flags.some((f) => f.includes("second of attention")),
  );
}

check(
  "score never exceeds 100",
  scoreHook(
    "Nobody tells you the secret truth: why is this shocking, banned, and dangerous? 100 people never knew.",
  ).score <= 100,
);

// `process.stdout` rather than `console`, matching the sibling smoke scripts
// and the lint rule that keeps `console` for warnings and errors.
process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
