/**
 * Offline retrieval evaluation against the golden set.
 *
 * `prompts/evaluations/golden-queries.json` says in its own description that it
 * is "used to compute recall@k, MRR, and nDCG in CI so a knowledge-base or
 * ranking change cannot silently regress retrieval". Nothing ever ran it, so
 * eleven hand-labelled cases sat in the repository measuring nothing.
 *
 * This is the runner. It generates no video and calls no video provider: it
 * embeds each query, retrieves, and compares the ids that come back against the
 * ids a human said should. The only cost is the embedding call, and query
 * embeddings are cached.
 *
 *   pnpm test:eval
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { composePrompt, generationRequestSchema } from "@beyond-social/prompt-engine";

import { createServiceClient } from "../src/lib/supabase/service";
import { DEFAULT_RECIPE, SYSTEM_LAYERS, getRetriever } from "../src/lib/prompt-engine/providers";

interface GoldenCase {
  readonly query: string;
  readonly platform?: string;
  readonly productType?: string;
  readonly expectedChunkIds: readonly string[];
}

/**
 * Ranking cut-off for MRR and nDCG.
 *
 * Recall is deliberately not cut off here. The recipe returns whatever its slot
 * limits and token budget allow, usually nine to thirteen chunks, and the model
 * reads all of them: truncating at an arbitrary k measures a list nobody is
 * served. Recall is therefore computed over everything actually delivered, and
 * k applies only to the two metrics that are about ordering.
 */
const K = 10;

/**
 * Floors, set from the measured baseline rather than an aspiration.
 *
 * A gate above current performance fails on day one and gets deleted; a gate far
 * below it never fires. These sit just under today's numbers so a regression
 * trips them and ordinary variation does not. Raise them when ranking improves.
 */
const MIN_RECALL = 0.35;
const MIN_MRR = 0.2;

function dcg(hits: readonly boolean[]): number {
  return hits.reduce((sum, hit, index) => sum + (hit ? 1 / Math.log2(index + 2) : 0), 0);
}

/** Every category any slot of the recipe can draw from. */
function servedCategories(): ReadonlySet<string> {
  return new Set(DEFAULT_RECIPE.slots.flatMap((slot) => slot.categories));
}

async function chunkCategories(): Promise<ReadonlyMap<string, string>> {
  const { data, error } = await createServiceClient().from("prompt_chunks").select("id, category");
  if (error) throw new Error(`could not read prompt_chunks: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.id, row.category]));
}

async function retrieve(item: GoldenCase): Promise<string[]> {
  const request = generationRequestSchema.parse({
    prompt: item.query,
    ...(item.platform ? { platform: item.platform } : {}),
    ...(item.productType ? { productType: item.productType } : {}),
  });
  const retrieval = await getRetriever().retrieve(request, DEFAULT_RECIPE);
  return composePrompt(request, DEFAULT_RECIPE, retrieval, SYSTEM_LAYERS).chunkRefs.map(
    (r) => r.id,
  );
}

async function main(): Promise<void> {
  const file = join(process.cwd(), "../../prompts/evaluations/golden-queries.json");
  const { cases } = JSON.parse(readFileSync(file, "utf8")) as { cases: GoldenCase[] };

  const categories = await chunkCategories();
  const served = servedCategories();

  const missing = [...new Set(cases.flatMap((c) => c.expectedChunkIds))].filter(
    (id) => !categories.has(id),
  );

  /*
   * A case is scored only if the recipe can reach at least one of its expected
   * chunks. Six of the golden cases are design and UX questions whose labels
   * live in categories no slot of the video recipe references, so they retrieve
   * nothing by construction: scoring them would report a ranking failure for
   * what is a missing recipe. They are listed instead, and start counting on
   * their own the day a recipe covers those categories.
   */
  const inScope = cases.filter((c) =>
    c.expectedChunkIds.some((id) => {
      const category = categories.get(id);
      return category !== undefined && served.has(category);
    }),
  );
  const unserved = cases.filter((c) => !inScope.includes(c));

  const rows: string[] = [];
  let recallSum = 0;
  let mrrSum = 0;
  let ndcgSum = 0;

  for (const item of inScope) {
    const got = await retrieve(item);
    const expected = new Set(item.expectedChunkIds);
    const hits = got.map((id) => expected.has(id));
    const ranked = hits.slice(0, K);

    const found = hits.filter(Boolean).length;
    const recall = expected.size === 0 ? 1 : found / expected.size;
    const firstHit = ranked.indexOf(true);
    const mrr = firstHit === -1 ? 0 : 1 / (firstHit + 1);
    // Ideal ranking puts every expected chunk at the top, bounded by k.
    const ideal = dcg(Array.from({ length: Math.min(expected.size, K) }, () => true));
    const ndcg = ideal === 0 ? 1 : dcg(ranked) / ideal;

    recallSum += recall;
    mrrSum += mrr;
    ndcgSum += ndcg;

    const missed = item.expectedChunkIds.filter((id) => !got.includes(id));
    rows.push(
      `  recall ${recall.toFixed(2)}  mrr ${mrr.toFixed(2)}  ndcg ${ndcg.toFixed(2)}  ` +
        `${found}/${expected.size} of ${got.length}  ${item.query}` +
        (missed.length > 0 ? `\n      missed: ${missed.join(", ")}` : ""),
    );
  }

  const n = inScope.length;
  const recall = recallSum / n;
  const mrr = mrrSum / n;
  const ndcg = ndcgSum / n;

  process.stdout.write(
    `${rows.join("\n")}\n\n` +
      `${n} scored cases (recall over the full retrieved set, ranking at k=${K})\n` +
      `  recall  ${recall.toFixed(3)}  (floor ${MIN_RECALL})\n` +
      `  mrr     ${mrr.toFixed(3)}  (floor ${MIN_MRR})\n` +
      `  ndcg    ${ndcg.toFixed(3)}\n`,
  );

  if (unserved.length > 0) {
    process.stdout.write(
      `\n${unserved.length} cases not scored: no recipe slot reaches their categories.\n` +
        unserved.map((c) => `  ${c.query}`).join("\n") +
        `\n`,
    );
  }
  if (missing.length > 0) {
    process.stdout.write(`\nLabels naming chunks that do not exist: ${missing.join(", ")}\n`);
  }

  const failures = [
    recall < MIN_RECALL ? `recall ${recall.toFixed(3)} below ${MIN_RECALL}` : "",
    mrr < MIN_MRR ? `mrr ${mrr.toFixed(3)} below ${MIN_MRR}` : "",
    missing.length > 0 ? `${missing.length} labels reference missing chunks` : "",
  ].filter(Boolean);

  if (failures.length > 0) {
    process.stdout.write(`\nFAILED: ${failures.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write("\nPASSED\n");
}

void main();
