import "server-only";

import { readDeletedAccounts } from "./rpc";
import { type DeletedAccounts } from "./schema";

/**
 * The deletion queue, split at the grace period.
 *
 * The database already decides which side of the 30 days an account falls on,
 * from one definition it shares with the view and any future purge. Splitting
 * here rather than in the table keeps that judgement out of the markup and lets
 * the page give the two groups different words, which they need: one group is
 * still restorable as a matter of course, the other is waiting on a decision
 * the platform has not made yet.
 */
export async function fetchDeletedAccounts(): Promise<DeletedAccounts | null> {
  const rows = await readDeletedAccounts();
  if (!rows) return null;

  return {
    eligible: rows.filter((row) => row.pastGracePeriod),
    inGrace: rows.filter((row) => !row.pastGracePeriod),
  };
}
