import { z } from "zod";

/**
 * The vocabulary of account deletion, shared by the settings form, the server
 * action behind it, and whatever enforces the flag at the session boundary.
 *
 * Several values here mirror something the database also states. Where that is
 * the case the SQL is the source of truth and the mirror is marked, because a
 * copy that drifts is worse than no copy at all.
 */

/**
 * The grace period a deleted account gets before it is eligible for permanent
 * erasure. Mirrors `account_deletion_grace()` in 0042_account_deletion.sql;
 * change it there first.
 */
export const DELETION_GRACE_PERIOD_DAYS = 30;

/**
 * What a returning person is told when they sign in to a deleted account.
 *
 * Deliberately not the generic credentials error. Someone whose account was
 * deleted and who is told "invalid email or password" will reset their password,
 * fail again, and reset it again, because no password can fix this. Naming the
 * real state is also the only way they learn a restore is possible at all.
 */
export const ACCOUNT_DELETED_MESSAGE = "This account has been deleted.";

/**
 * Mirrors the exception `request_account_deletion` raises when the account is
 * already flagged. Matched rather than parsed because PostgREST surfaces the
 * message, not a code we control.
 */
const DB_ALREADY_DELETED = "already been deleted";

export const deletionRequestSchema = z.object({
  // Optional, and it stays optional: making someone justify leaving to be
  // allowed to leave is a dark pattern. The cap matches the column constraint.
  reason: z.string().trim().max(500).optional(),
});

export type DeletionRequestInput = z.infer<typeof deletionRequestSchema>;

/** One row of `request_account_deletion`, validated on the way back in. */
export const deletedAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  deleted_at: z.string().datetime({ offset: true }),
  deletion_reason: z.string().nullable(),
});

export type DeletedAccountRow = z.infer<typeof deletedAccountSchema>;

export type DeletedAccount = {
  readonly id: string;
  readonly email: string;
  readonly deletedAt: string;
  readonly reason: string | null;
  /** When the account stops being restorable and becomes erasable. */
  readonly erasableAt: string;
};

export type DeletionResult =
  | { readonly status: "deleted"; readonly account: DeletedAccount }
  | { readonly status: "already_deleted" }
  | { readonly status: "error"; readonly message: string };

export function isAlreadyDeletedError(message: string): boolean {
  return message.includes(DB_ALREADY_DELETED);
}

export function toDeletedAccount(row: DeletedAccountRow): DeletedAccount {
  const erasable = new Date(row.deleted_at);
  erasable.setUTCDate(erasable.getUTCDate() + DELETION_GRACE_PERIOD_DAYS);

  return {
    id: row.id,
    email: row.email,
    deletedAt: row.deleted_at,
    reason: row.deletion_reason,
    erasableAt: erasable.toISOString(),
  };
}
