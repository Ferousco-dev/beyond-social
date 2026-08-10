import "server-only";

import { logger } from "@/lib/logger";
import { serverEnv } from "@/lib/server-env";

/**
 * Running an Apify actor and reading what it produced.
 *
 * Apify is a marketplace of scrapers, so this is deliberately thin: it starts an
 * actor, waits, and hands back whatever rows landed in the dataset. Which actor
 * and what it returns are the caller's problem, because those differ per actor
 * and change when their authors change them.
 *
 * The synchronous endpoint is used rather than start-then-poll. A search returns
 * a couple of dozen rows in well under a minute, and a polling loop would be a
 * second thing to get wrong for no gain at this size.
 */

const BASE = "https://api.apify.com/v2";

/**
 * Apify's own ceiling on a synchronous run is five minutes. This is well under
 * it: nobody waits that long for a search, and a run that slow is one to
 * abandon rather than one to keep paying for.
 */
const TIMEOUT_SECONDS = 90;

/** A little longer than the run, so the run's own timeout is what fires. */
const FETCH_TIMEOUT_MS = (TIMEOUT_SECONDS + 15) * 1000;

export class ApifyError extends Error {}

export const isApifyConfigured = (): boolean => serverEnv.APIFY_TOKEN !== "";

/**
 * Runs an actor and returns its dataset rows, untyped.
 *
 * Untyped on purpose. Every actor has its own output shape, several return
 * fields under more than one name across versions, and a schema here would make
 * this module the thing that breaks when an author renames a key. The mappers
 * validate what they actually need.
 */
export async function runActor(
  actorId: string,
  input: Readonly<Record<string, unknown>>,
): Promise<readonly unknown[]> {
  if (!isApifyConfigured()) throw new ApifyError("Apify is not configured");

  // The actor id in a path uses `~` where the console shows `/`, and both forms
  // get pasted into env vars, so it is normalised rather than trusted.
  const path = actorId.trim().replace("/", "~");

  const response = await fetch(
    `${BASE}/acts/${encodeURIComponent(path)}/run-sync-get-dataset-items?timeout=${TIMEOUT_SECONDS}`,
    {
      method: "POST",
      headers: {
        // The token goes in a header rather than the query string, so it cannot
        // end up in a proxy log or an error message quoting the URL.
        Authorization: `Bearer ${serverEnv.APIFY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApifyError(`Apify ${path} failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const rows: unknown = await response.json().catch(() => null);
  if (!Array.isArray(rows)) {
    logger.warn("apify returned no dataset array", { actor: path });
    return [];
  }

  return rows;
}
