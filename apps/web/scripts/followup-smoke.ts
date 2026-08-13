/**
 * Behaviour checks for the follow-up suggestions. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/followup-smoke.ts
 *
 * The rule these assert is that a suggestion is never offered back to somebody
 * who already asked for it. Chips are cheap to show and expensive to get wrong:
 * "Shorter" under a video the user explicitly asked to be fifteen seconds reads
 * as not having listened, which is worse than showing nothing.
 */
import { followUpsFor } from "../src/lib/generation/follow-ups";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const labels = (prompt: string): string[] => followUpsFor(prompt).map((item) => item.label);

{
  const out = labels("A video about my coffee shop");
  check(
    "a plain brief gets the first three levers",
    out.length === 3 && out[0] === "Shorter",
    out.join(", "),
  );
}

{
  check(
    "an empty brief gets nothing rather than a default set",
    followUpsFor("   ").length === 0,
    String(followUpsFor("   ").length),
  );
}

{
  const out = labels("A 15 second video about my coffee shop");
  check("a stated length drops Shorter", !out.includes("Shorter"), out.join(", "));
}

{
  const out = labels("Make it 30s, punchy");
  check(
    "a stated length and pace drop both of theirs",
    !out.includes("Shorter") && !out.includes("More energy"),
    out.join(", "),
  );
}

{
  const out = labels("Open on the espresso machine, then the street");
  check("a stated opening drops Different opening", !out.includes("Different opening"), out.join(", "));
}

{
  const out = labels("Something moody and cinematic about late night driving");
  check("a stated mood drops Different mood", !out.includes("Different mood"), out.join(", "));
}

{
  // Every lever named at once. Nothing left to suggest is a real answer.
  const out = labels("A short, moody, slow 20 second piece that opens on her face");
  check("a brief that names everything gets nothing", out.length === 0, out.join(", "));
}

{
  // The bound matters: four levers exist and a row of chips is a nudge.
  const out = labels("A video");
  check("never more than three", out.length <= 3, String(out.length));
}

{
  // Substrings must not trigger a skip: "opens" is a word, "reopened" is not
  // the user specifying an opening shot.
  const out = labels("A video about a shop that reopened downtown");
  check(
    "a word boundary keeps a substring from dropping a lever",
    out.includes("Different opening"),
    out.join(", "),
  );
}

{
  const out = followUpsFor("A video about my coffee shop");
  check(
    "each suggestion carries a full sentence to send",
    out.every((item) => item.prompt.trim().split(/\s+/).length >= 4),
    out.map((item) => item.prompt).join(" | "),
  );
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
