import "server-only";

import { signRenders } from "@/lib/generation/render-url";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * What the public surfaces are allowed to read, in one place.
 *
 * The REST routes and the MCP tools answer the same questions for the same
 * callers, so they read through the same functions. Two copies of "a
 * generation, as an outsider sees it" is two places to forget that
 * `result_path` is internal, and the copy that forgets is the one that leaks
 * the storage layout.
 *
 * Everything here reads with the service role and is therefore scoped by the
 * `userId` argument rather than by RLS. Passing anything other than an
 * authenticated caller's own id is a privacy bug, which is why none of these
 * take a filter.
 */

export interface PublicGeneration {
  readonly id: string;
  readonly prompt: string;
  readonly status: string;
  readonly aspect_ratio: string;
  readonly created_at: string;
  /** Signed and short-lived. Null while the run has produced nothing. */
  readonly result_url: string | null;
  /** Why it failed, when it failed. Null otherwise. */
  readonly error: string | null;
}

export async function listGenerations(
  userId: string,
  limit: number,
): Promise<PublicGeneration[] | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("video_generations")
    .select("id, prompt, status, result_url, result_path, aspect_ratio, created_at, error")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return null;

  /*
   * `result_url` is minted per request rather than stored. The bucket that
   * holds finished videos is private, so the permanent public link this used to
   * return no longer resolves. Callers see the same field with the same
   * meaning; it simply expires, which is stated in the docs.
   *
   * `result_path` is internal and stripped: it is a storage location, and
   * publishing it would invite callers to construct their own URLs against a
   * bucket whose access rules are ours to change.
   */
  const rows = (data ?? []) as (PublicGeneration & { result_path: string | null })[];
  const signed = await signRenders(
    service,
    rows.map((row) => row.result_path),
  );

  return rows.map(({ result_path, ...row }) => ({
    ...row,
    result_url: result_path ? (signed.get(result_path) ?? null) : null,
  }));
}

/**
 * Rolled-up AI usage over a trailing window.
 *
 * Wrapped rather than returned bare, so "the rollup failed" and "you have not
 * used anything yet" stay distinguishable. Collapsing them turns a quiet month
 * into a 500.
 */
export async function readUsage(
  userId: string,
  days = 30,
): Promise<{ readonly usage: unknown } | null> {
  const since = new Date(Date.now() - days * 24 * 3600_000).toISOString();
  const { data, error } = await createServiceClient().rpc("ai_usage_summary", {
    p_user: userId,
    p_since: since,
  });
  if (error) return null;
  return { usage: Array.isArray(data) ? (data[0] ?? null) : (data ?? null) };
}

/**
 * Credits left, summed from the ledger.
 *
 * Summed here rather than through `credit_balance()`, which answers for
 * `auth.uid()` and therefore answers for nobody under the service role. The
 * ledger is the source of truth either way; the profile counters are a cache of
 * it and are not read.
 */
export async function readCreditBalance(userId: string): Promise<number | null> {
  const { data, error } = await createServiceClient()
    .from("credit_ledger")
    .select("delta")
    .eq("user_id", userId);
  if (error) return null;
  return (data ?? []).reduce((total, row) => total + row.delta, 0);
}
