/**
 * Behaviour check for the low-balance warning threshold. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/credit-warning-smoke.ts
 *
 * The one thing worth getting wrong here is the boundary: the warning is
 * meant to fire on the run that leaves nothing left for another one, not a
 * run early and not a run late.
 */
import { lowBalanceMessage } from "../src/lib/generation/gate";
import { isUpgradeReason } from "../src/lib/credits/types";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

check("plenty left says nothing", lowBalanceMessage(20, 6) === null);
check("exactly enough for one more says nothing", lowBalanceMessage(6, 6) === null);
check("one short of the floor warns", lowBalanceMessage(5, 6) !== null);
check("zero left warns", lowBalanceMessage(0, 6) !== null);
check("a negative remainder still warns, not crashes", lowBalanceMessage(-3, 6) !== null);
check("no known floor says nothing rather than guessing", lowBalanceMessage(0, null) === null);

check(
  "says credits, not a number, at zero",
  lowBalanceMessage(0, 6) === "This uses your last credits for now. Top up to keep making videos.",
);
check("singular credit at exactly one", lowBalanceMessage(1, 6)?.includes("1 credit ") ?? false);
check("plural credits above one", lowBalanceMessage(3, 6)?.includes("3 credits ") ?? false);

// The notice's upgrade link only belongs on a denial an upgrade actually
// fixes. Showing it on a sign-in or a database hiccup would send someone to
// the billing page for a problem money cannot solve.
check("a low plan can be upgraded past", isUpgradeReason("plan_tier"));
check("a low balance can be upgraded past", isUpgradeReason("insufficient_credits"));
check("not being signed in has no upgrade fix", !isUpgradeReason("not_authenticated"));
check("an unknown model has no upgrade fix", !isUpgradeReason("unknown_model"));
check("an inactive model has no upgrade fix", !isUpgradeReason("model_inactive"));
check("a failed check has no upgrade fix", !isUpgradeReason("check_failed"));

// `process.stdout` rather than `console`, matching the sibling smoke scripts
// and the lint rule that keeps `console` for warnings and errors.
process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
