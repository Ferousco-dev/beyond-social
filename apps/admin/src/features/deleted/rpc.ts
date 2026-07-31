import "server-only";

import { createDeletedClient } from "./database";
import { deletedAccountSchema, type DeletedAccount } from "./schema";

/**
 * Every call this feature makes to the database.
 *
 * The read returns null on failure rather than throwing, so a page that cannot
 * be read says so instead of white-screening; an empty list and a failed read
 * are opposite answers and must not look alike. The write returns a message
 * instead, because an operator who pressed Restore needs to know whether it
 * took effect.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function readDeletedAccounts(): Promise<readonly DeletedAccount[] | null> {
  const supabase = await createDeletedClient();
  const { data, error } = await supabase.rpc("admin_deleted_accounts");
  if (error) return null;

  const parsed = deletedAccountSchema.array().safeParse(
    (data ?? []).map((row) => ({
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      deletedAt: row.deleted_at,
      deletionReason: row.deletion_reason,
      deletedByEmail: row.deleted_by_email,
      erasableAt: row.erasable_at,
      daysRemaining: row.days_remaining,
      pastGracePeriod: row.past_grace_period,
    })),
  );

  if (!parsed.success) {
    console.error("admin_deleted_accounts returned an unexpected shape", parsed.error.message);
    return null;
  }
  return parsed.data;
}

export async function restoreAccount(userId: string): Promise<ActionResult> {
  const supabase = await createDeletedClient();
  // The audit row is written inside the function, in the same transaction as
  // the change, so a restore cannot succeed unrecorded.
  const { error } = await supabase.rpc("admin_restore_account", { p_user: userId });
  return error ? { ok: false, message: error.message } : { ok: true };
}
