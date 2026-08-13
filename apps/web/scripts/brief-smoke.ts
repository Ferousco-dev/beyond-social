/**
 * Behaviour checks for the brief and analysis schemas. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/brief-smoke.ts
 *
 * Every case here is a reply that used to be thrown away whole. The schemas
 * bounded presentation lengths with hard `.max()`, so one over-long option or a
 * fifth question rejected the entire object and the user was told their idea
 * "came back in a shape we could not read". These assert the opposite: trim the
 * excess, drop the individual bad item, keep the answer.
 */
import { analysisSchema, briefSchema, parseJsonReply } from "../src/lib/brief/schema";
import { z } from "zod";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const question = (label: string, options: string[]) => ({
  label,
  question: "Which one?",
  options,
});

/** The analysis half. */
function analysis(payload: unknown) {
  return parseJsonReply(JSON.stringify(payload), analysisSchema);
}

const base = { topic: "Superman", audience: "Comic fans", angle: "A heroic ascent" };

{
  const out = analysis({
    ...base,
    questions: [
      question("SHOT", ["A slow cinematic rise from street level with swirling debris", "Fast"]),
    ],
  });
  check(
    "an over-long option is trimmed, not rejected",
    "data" in out && out.data.questions[0]?.options[0]?.length === 40,
    "data" in out ? `${out.data.questions[0]?.options[0]?.length} chars` : out.reason,
  );
}

{
  const out = analysis({
    ...base,
    questions: Array.from({ length: 5 }, (_, i) => question(`Q${i}`, ["One", "Two"])),
  });
  check(
    "a fifth question is dropped, not fatal",
    "data" in out && out.data.questions.length === 4,
    "data" in out ? `${out.data.questions.length} kept` : out.reason,
  );
}

{
  const out = analysis({ ...base, angle: "x".repeat(300), questions: [question("L", ["a", "b"])] });
  check(
    "an over-long angle is trimmed",
    "data" in out && out.data.angle.length === 240,
    "data" in out ? `${out.data.angle.length} chars` : out.reason,
  );
}

{
  const out = analysis({
    ...base,
    // The second has one option, which is a question with nothing to pick from.
    questions: [question("OK", ["a", "b"]), question("BAD", ["only"])],
  });
  check(
    "a malformed question costs only itself",
    "data" in out && out.data.questions.length === 1 && out.data.questions[0]?.label === "OK",
    "data" in out ? `${out.data.questions.length} kept` : out.reason,
  );
}

{
  const out = analysis({ ...base, questions: [] });
  check(
    "no questions parses, so the flow can write the brief",
    "data" in out && out.data.questions.length === 0,
    "data" in out ? "" : out.reason,
  );
}

{
  const out = analysis({ ...base });
  check("missing questions defaults to none", "data" in out, "data" in out ? "" : out.reason);
}

/** The brief half. */
const beats = [
  { label: "Hook", timing: "0-3s", detail: "Street level, looking up" },
  { label: "Lift", timing: "3-8s", detail: "He rises through cloud" },
];

/** A brief that should always parse, so each case can vary one field of it. */
const goodBrief = {
  hook: "He looked up.",
  titles: ["One"],
  beats,
  durationSeconds: 15,
  hashtags: [],
  prompt: "x".repeat(50),
};

{
  const out = parseJsonReply(
    JSON.stringify({
      hook: "He looked up.",
      titles: ["One"],
      beats,
      // Models return this as a string about as often as a number.
      durationSeconds: "15",
      hashtags: ["superman"],
      prompt: "x".repeat(50),
    }),
    briefSchema,
  );
  check(
    "a duration sent as a string is coerced",
    "data" in out && out.data.durationSeconds === 15,
    "data" in out ? String(out.data.durationSeconds) : out.reason,
  );
}

{
  const out = parseJsonReply(
    JSON.stringify({
      hook: "H",
      titles: ["One"],
      beats,
      durationSeconds: 900,
      hashtags: [],
      prompt: "x".repeat(50),
    }),
    briefSchema,
  );
  check(
    "an absurd duration is clamped, not rejected",
    "data" in out && out.data.durationSeconds === 180,
    "data" in out ? String(out.data.durationSeconds) : out.reason,
  );
}

{
  // One beat is not a script, and unlike a long string it cannot be salvaged.
  const out = parseJsonReply(
    JSON.stringify({
      hook: "H",
      titles: ["One"],
      beats: [beats[0]],
      durationSeconds: 15,
      hashtags: [],
      prompt: "x".repeat(50),
    }),
    briefSchema,
  );
  check(
    "a single beat is still refused",
    !("data" in out),
    "data" in out ? "accepted" : out.reason,
  );
}

{
  // A trailing empty string is a routine model artefact, and it used to reject
  // the whole brief on either of these two fields.
  const out = parseJsonReply(
    JSON.stringify({ ...goodBrief, hashtags: ["fashion", ""], titles: ["Three ways", ""] }),
    briefSchema,
  );
  check(
    "an empty hashtag and title are dropped, not fatal",
    "data" in out && out.data.hashtags.length === 1 && out.data.titles.length === 1,
    "data" in out ? "" : out.reason,
  );
}

{
  const out = parseJsonReply(JSON.stringify({ ...goodBrief, titles: [""] }), briefSchema);
  check(
    "a brief with no usable title is still refused",
    !("data" in out),
    "data" in out ? "accepted" : out.reason,
  );
}

{
  // The one length bound that is correctness rather than presentation: this
  // string reaches the video model unedited and spends a credit.
  const out = parseJsonReply(JSON.stringify({ ...goodBrief, prompt: "a video" }), briefSchema);
  check(
    "a prompt too thin to direct anything is refused",
    !("data" in out),
    "data" in out ? "accepted" : out.reason,
  );
}

{
  const out = parseJsonReply("not json at all", analysisSchema);
  check(
    "a non-JSON reply reports why",
    !("data" in out) && out.reason.includes("no JSON"),
    "data" in out ? "accepted" : out.reason,
  );
}

{
  // Models fence their JSON as often as not.
  const out = parseJsonReply(
    'Here you go:\n```json\n{"topic":"T","audience":"A","angle":"G","questions":[]}\n```',
    analysisSchema,
  );
  check("a fenced reply still parses", "data" in out, "data" in out ? "" : out.reason);
}

/**
 * The review pass.
 *
 * Restated here rather than imported, because `review.ts` is `server-only` and a
 * smoke script has no server to be in. The shape is small and the point of the
 * checks is the behaviour around it: a review must be able to say "nothing
 * wrong", and must not be able to smuggle a broken brief back in as a revision.
 */
const reviewSchema = z.object({
  issues: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .transform((value) => value.slice(0, 200)),
    )
    .default([])
    .transform((issues) => issues.slice(0, 6)),
  revised: briefSchema.nullable().default(null),
});

{
  const out = parseJsonReply(JSON.stringify({ issues: [], revised: null }), reviewSchema);
  check(
    "a clean review returns no revision",
    "data" in out && out.data.revised === null && out.data.issues.length === 0,
    "data" in out ? "" : out.reason,
  );
}

{
  const out = parseJsonReply(JSON.stringify({}), reviewSchema);
  check(
    "an empty review object is treated as nothing wrong",
    "data" in out && out.data.revised === null,
    "data" in out ? "" : out.reason,
  );
}

{
  const out = parseJsonReply(
    JSON.stringify({ issues: ["Ignored the stated hook style"], revised: goodBrief }),
    reviewSchema,
  );
  check(
    "a revision carries a full brief",
    "data" in out && out.data.revised?.hook === "He looked up.",
    "data" in out ? "" : out.reason,
  );
}

{
  // A revision that is itself broken must not replace a working brief.
  const out = parseJsonReply(
    JSON.stringify({ issues: ["x"], revised: { ...goodBrief, beats: [beats[0]] } }),
    reviewSchema,
  );
  check(
    "a broken revision is refused, not applied",
    !("data" in out),
    "data" in out ? "accepted" : out.reason,
  );
}

// `process.stdout` rather than `console`, matching the sibling smoke scripts
// and the lint rule that keeps `console` for warnings and errors.
process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
