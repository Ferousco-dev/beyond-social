/**
 * Behaviour checks for the history the reply writer reads. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/history-smoke.ts
 *
 * The point of these is that a failed render's reason reaches the model, and
 * that nothing else about a turn changes on the way there: a note appended to
 * a successful turn would be the assistant claiming a failure that never
 * happened.
 */
import { toHistory, type ThreadTurn } from "../src/lib/chat/history";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const reply = { role: "assistant", content: "Here is that clip." };

/** The single turn a case builds, as the writer would read it. */
function only(rows: unknown): ThreadTurn {
  const [turn] = toHistory(rows);
  if (!turn) throw new Error("expected exactly one turn");
  return turn;
}

check(
  "plain turns pass through",
  only([{ role: "user", content: "make it" }]).content === "make it",
);

check("roles survive", only([{ role: "user", content: "hi" }]).role === "user");

check(
  "a ready draft adds nothing",
  only([{ ...reply, generation_status: "ready", generation_error: null }]).content ===
    "Here is that clip.",
);

check(
  "a running draft adds nothing",
  only([{ ...reply, generation_status: "generating", generation_error: null }]).content ===
    "Here is that clip.",
);

const failed = only([
  {
    ...reply,
    generation_status: "failed",
    generation_error: "Not enough credits left for this video",
  },
]).content;
check(
  "a failure carries its reason",
  failed.includes("Not enough credits left for this video"),
  failed,
);
check("a failure keeps what was said", failed.startsWith("Here is that clip."), failed);

const cancelled = only([
  { ...reply, generation_status: "cancelled", generation_error: "Cancelled while rendering" },
]).content;
check(
  "a cancelled render is explained too",
  cancelled.includes("Cancelled while rendering"),
  cancelled,
);

const reasonless = only([
  { ...reply, generation_status: "failed", generation_error: null },
]).content;
check("a failure with no reason still says so", reasonless.includes("did not finish"), reasonless);

check(
  "an empty turn is the note alone",
  only([
    {
      role: "assistant",
      content: "",
      generation_status: "failed",
      generation_error: "kie timed out",
    },
  ]).content === "(The video for this turn did not finish: kie timed out)",
);

check("a thread that failed to load is empty, not thrown", toHistory(null).length === 0);

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
