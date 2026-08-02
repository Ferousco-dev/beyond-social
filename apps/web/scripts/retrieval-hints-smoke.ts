/**
 * Does supplying platform and product hints actually change what is retrieved?
 *
 * The ranker scores candidates partly on how well a chunk's declared
 * applicability matches the request. Neither hint was ever supplied, so that
 * dimension returned a flat 0.5 for every chunk and discriminated nothing.
 * This asserts the fix does something measurable rather than looking correct.
 *
 *   tsx --tsconfig scripts/tsconfig.json scripts/retrieval-hints-smoke.ts
 */
import { composePrompt, generationRequestSchema } from "@beyond-social/prompt-engine";

import { DEFAULT_RECIPE, SYSTEM_LAYERS, getRetriever } from "../src/lib/prompt-engine/providers";

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

async function idsFor(input: Record<string, unknown>): Promise<string[]> {
  const request = generationRequestSchema.parse(input);
  const retrieval = await getRetriever().retrieve(request, DEFAULT_RECIPE);
  return composePrompt(request, DEFAULT_RECIPE, retrieval, SYSTEM_LAYERS).chunkRefs.map(
    (r) => r.id,
  );
}

async function main(): Promise<void> {
  const prompt = "a person talking to camera about a new pair of running shoes";

  const bare = await idsFor({ prompt });
  const hinted = await idsFor({ prompt, platform: "tiktok", productType: "product-video" });
  const other = await idsFor({ prompt, platform: "youtube", productType: "explainer" });

  check("retrieval returns knowledge at all", bare.length > 0, `${bare.length} chunks`);

  // The point of the change: hints must move the ranking. If they do not, the
  // metadata is still doing nothing and the fix is cosmetic.
  const changed = bare.join() !== hinted.join();
  check("hints change what comes back", changed, changed ? "" : "identical to unhinted");

  const differsByContext = hinted.join() !== other.join();
  check("different hints retrieve differently", differsByContext);

  process.stdout.write(
    `\nunhinted: ${bare.slice(0, 5).join(", ")}\n` +
      `tiktok/product: ${hinted.slice(0, 5).join(", ")}\n` +
      `youtube/explainer: ${other.slice(0, 5).join(", ")}\n\n` +
      `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
  );
  if (failures > 0) process.exit(1);
}

void main();
