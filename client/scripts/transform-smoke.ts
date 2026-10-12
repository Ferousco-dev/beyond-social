/**
 * Behaviour check for how a Go API job becomes something the UI shows. No key,
 * no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/transform-smoke.ts
 *
 * The thing worth guarding is that a result URL only ever appears once the
 * backend says the job completed, and only if it is https.
 */
import { jobSchema } from "../src/lib/go-api/schemas";
import { isFinished, toJobView } from "../src/features/transform/types";

let failures = 0;
function check(name: string, passed: boolean): void {
  process.stdout.write(`${passed ? "PASS" : "FAIL"}  ${name}\n`);
  if (!passed) failures += 1;
}

const view = (raw: unknown) => toJobView(jobSchema.parse(raw));
const base = { id: "j1", progress: 40 };

const running = view({ ...base, status: "running", stage: "generating", result: { video_url: "https://x/y.mp4" } });
check("a running job shows no result even if one is present", running.resultUrl === null);
check("a running job is not finished", !isFinished(running));
check("the stage is carried", running.stage === "generating");

const done = view({ ...base, status: "completed", progress: 100, result: { video_url: "https://cdn.example/out.mp4" } });
check("a completed job exposes its https result", done.resultUrl === "https://cdn.example/out.mp4");
check("a completed job is finished", isFinished(done));

check("an http result is dropped", view({ ...base, status: "completed", result: { video_url: "http://x/y.mp4" } }).resultUrl === null);
check("a javascript: result is dropped", view({ ...base, status: "completed", result: { video_url: "javascript:alert(1)" } }).resultUrl === null);
check("a completed job without a result has none", view({ ...base, status: "completed", result: {} }).resultUrl === null);
check("a null result is tolerated", view({ ...base, status: "queued", result: null }).resultUrl === null);

const failed = view({ ...base, status: "failed", error: "The video could not be generated." });
check("a failed job carries its message and is finished", failed.error !== null && isFinished(failed));
check("an unknown status is rejected", !jobSchema.safeParse({ ...base, status: "weird" }).success);

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
