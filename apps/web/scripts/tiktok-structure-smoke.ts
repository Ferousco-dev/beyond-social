/**
 * Behaviour checks for the named post structure. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/tiktok-structure-smoke.ts
 *
 * `structure` used to be a generic array of beat strings. It is now Hook,
 * Problem, Escalation, Payoff, CTA named explicitly, and the point of this
 * file is the same one every other schema here makes: a post that skips a
 * beat is not a malformed reply, and the one thing that must still be
 * refused is a post with no hook at all.
 */
import { postAnalysisSchema } from "../src/lib/tiktok/analyse";
import { postStructureSchema, structureBeats } from "../src/lib/tiktok/structure";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const baseAnalysis = {
  format: "Curiosity-driven product reveal",
  hook: "Nobody tells you this about a bakery website",
  whyItWorks: "Opens a gap and closes it late",
  brief: "A short vertical video about a product nobody expected to work this well.",
  confidence: "low" as const,
  hookPattern: "curiosity_gap" as const,
};

{
  // Every beat present, the shape the prompt asks for on a post with a full arc.
  const structure = {
    hook: "She looks up from a broken checkout page",
    problem: "Her bakery's website loses orders nobody sees fail",
    escalation: "Three more customers bail before she notices",
    payoff: "One line of copy fixes the whole flow",
    cta: "Link in bio to audit your own site",
  };
  const out = postAnalysisSchema.safeParse({ ...baseAnalysis, structure });
  check(
    "a full five-beat structure parses",
    out.success && out.data.structure.escalation === structure.escalation,
    out.success ? "" : out.error.issues[0]?.message,
  );
}

{
  // Most organic posts skip at least one beat. Escalation and CTA are the two
  // named in the product feedback as commonly absent.
  const out = postAnalysisSchema.safeParse({
    ...baseAnalysis,
    structure: {
      hook: "She looks up from a broken checkout page",
      problem: "Her bakery's website loses orders nobody sees fail",
      escalation: null,
      payoff: "One line of copy fixes the whole flow",
      cta: null,
    },
  });
  check(
    "a structure missing escalation and cta still parses",
    out.success && out.data.structure.escalation === null && out.data.structure.cta === null,
    out.success ? "" : out.error.issues[0]?.message,
  );
}

{
  // A model that leaves a key out entirely, rather than sending null for it,
  // is the more common shape in practice.
  const out = postAnalysisSchema.safeParse({
    ...baseAnalysis,
    structure: { hook: "She looks up from a broken checkout page" },
  });
  check(
    "an omitted beat key defaults to null rather than failing",
    out.success && out.data.structure.problem === null && out.data.structure.payoff === null,
    out.success ? "" : out.error.issues[0]?.message,
  );
}

{
  // A beat sent as an empty string is the same as not sending it: nothing to
  // show, not a broken reply.
  const out = postStructureSchema.safeParse({
    hook: "She looks up from a broken checkout page",
    problem: "",
    escalation: "   ",
    payoff: null,
    cta: null,
  });
  check(
    "a blank or whitespace-only beat becomes null",
    out.success && out.data.problem === null && out.data.escalation === null,
    out.success ? "" : out.error.issues[0]?.message,
  );
}

{
  // The one beat that stays required: a post analysed with no hook at all is
  // an extraction failure, not a thin result.
  const out = postAnalysisSchema.safeParse({
    ...baseAnalysis,
    structure: { hook: "", problem: null, escalation: null, payoff: null, cta: null },
  });
  check("a structure with no hook is refused", !out.success);
}

{
  // The shape this schema replaced: a bare array of beat strings. It must not
  // silently coerce into something else, since analyses are computed fresh on
  // every request rather than read back from storage, so there is nothing
  // persisted in the old shape to migrate.
  const out = postAnalysisSchema.safeParse({
    ...baseAnalysis,
    structure: ["Hook: she looks up", "Problem: the checkout is broken", "Payoff: one fix"],
  });
  check("the old array-shaped structure no longer parses", !out.success);
}

{
  const beats = structureBeats(
    postStructureSchema.parse({
      hook: "She looks up",
      problem: "The checkout is broken",
      escalation: null,
      payoff: "One fix works",
      cta: null,
    }),
  );
  check(
    "structureBeats drops the skipped beats and keeps reading order",
    beats.map((beat) => beat.label).join(",") === "Hook,Problem,Payoff",
    beats.map((beat) => beat.label).join(","),
  );
}

// `process.stdout` rather than `console`, matching the sibling smoke scripts
// and the lint rule that keeps `console` for warnings and errors.
process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
