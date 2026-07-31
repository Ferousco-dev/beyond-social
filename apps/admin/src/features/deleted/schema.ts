import { z } from "zod";

/**
 * The one shape that crosses this feature's boundary: a deleted account as the
 * database describes it.
 *
 * These are account facts only. There is no column here for anything the person
 * wrote, and none is read: an operator working the erasure queue needs to know
 * that an account was deleted and when its grace period ends, not what was in
 * it.
 */

export const deletedAccountSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  fullName: z.string().nullable(),
  deletedAt: z.string(),
  deletionReason: z.string().nullable(),
  /** Null when the account holder deleted it themselves. */
  deletedByEmail: z.string().nullable(),
  erasableAt: z.string(),
  daysRemaining: z.number().int(),
  pastGracePeriod: z.boolean(),
});

export type DeletedAccount = z.infer<typeof deletedAccountSchema>;

/**
 * The queue split the way an operator works it: what is waiting, and what has
 * come due. Both lists keep the oldest deletion first, as the database orders
 * them.
 */
export interface DeletedAccounts {
  readonly eligible: readonly DeletedAccount[];
  readonly inGrace: readonly DeletedAccount[];
}

export const restoreSchema = z.object({ userId: z.string().uuid() });
