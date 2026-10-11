/**
 * Behaviour check for the prompt registry's fallback path. No key, no
 * network: run unconfigured, which is the one path this can exercise without
 * a live Supabase project.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/prompt-registry-smoke.ts
 */
import { getPromptTemplate } from "../src/lib/prompts/registry";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const fallback = "You write short-form video scripts.";

const first = await getPromptTemplate("script.write.system", fallback);
check("an unconfigured lookup returns the fallback", first === fallback, first);

const second = await getPromptTemplate("script.write.system", fallback);
check("a repeat lookup for the same key also returns the fallback", second === fallback, second);

const other = await getPromptTemplate("brief.analysis.system", "a different fallback");
check(
  "a different key gets its own fallback, not a cached one from another key",
  other === "a different fallback",
  other,
);

// `process.stdout` rather than `console`, matching the sibling smoke scripts
// and the lint rule that keeps `console` for warnings and errors.
process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
