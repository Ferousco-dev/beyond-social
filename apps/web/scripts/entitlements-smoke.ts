/**
 * Behaviour checks for plan entitlements. No key, no network.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/entitlements-smoke.ts
 *
 * This decides who can reach the API, the webhooks, and the MCP endpoint, so
 * the cases that matter are the ones where it could quietly let a free account
 * through, or lock out someone who is paying.
 */
import {
  hasIntegrations,
  INTEGRATIONS_PLAN,
  isAtLeast,
  planRank,
} from "../src/lib/billing/entitlements";
import { PLANS } from "../src/lib/billing/plans";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

check("free is the bottom", planRank("free") < planRank("creator"));
check("studio is the top", planRank("studio") > planRank("creator"));

check("every known plan is ranked", new Set(PLANS.map(planRank)).size === PLANS.length);

// An unknown plan is what a corrupt row, a renamed tier, or a future plan looks
// like from here. Any of them ranking above free would hand out the paid
// surfaces by accident.
check("an unknown plan ranks as free", planRank("enterprise") === planRank("free"));
check("an empty plan ranks as free", planRank("") === planRank("free"));

check("a plan meets itself", isAtLeast("creator", "creator"));
check("a lower plan does not meet a higher one", !isAtLeast("creator", "studio"));
check("a higher plan meets a lower one", isAtLeast("studio", "creator"));

check("integrations are on studio", INTEGRATIONS_PLAN === "studio");
check("free has no integrations", !hasIntegrations("free"));
check("creator has no integrations", !hasIntegrations("creator"));
check("studio has integrations", hasIntegrations("studio"));
check("an unknown plan has no integrations", !hasIntegrations("enterprise"));

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
