import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

import { accountRpc } from "./rpc";
import {
  deletedAccountSchema,
  deletionRequestSchema,
  isAlreadyDeletedError,
  toDeletedAccount,
  type DeletionRequestInput,
  type DeletionResult,
} from "./types";

const GENERIC_ERROR = "We could not delete your account. Please try again.";

/**
 * Flags the signed-in account as deleted.
 *
 * Nothing is destroyed here and nothing is destroyed later without a human
 * deciding: the row keeps everything the person made, and the database starts
 * the grace period. The caller's next job is to end the session, because the
 * account is locked out of its own data from this moment on.
 */
export async function requestAccountDeletion(
  input: DeletionRequestInput,
): Promise<DeletionResult> {
  const parsed = deletionRequestSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: GENERIC_ERROR };
  if (!isSupabaseConfigured) return { status: "error", message: GENERIC_ERROR };

  const { data, error } = await accountRpc("request_account_deletion", {
    p_reason: parsed.data.reason ?? null,
  });

  if (error !== null) {
    if (isAlreadyDeletedError(error.message)) return { status: "already_deleted" };
    logger.error("account deletion failed", { message: error.message });
    return { status: "error", message: GENERIC_ERROR };
  }

  const row = deletedAccountSchema.array().nonempty().safeParse(data);
  if (!row.success) {
    // The flag is set either way, so the failure is in reading it back. Saying
    // "try again" would invite a second call that raises "already deleted".
    logger.error("account deletion returned an unreadable row");
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "deleted", account: toDeletedAccount(row.data[0]) };
}

/**
 * Whether the signed-in account has been deleted.
 *
 * Asked at the session boundary on every request, not in a page. A page-level
 * check is decoration: the API, the server actions and PostgREST are all still
 * reachable with a valid token. Defaults to false so a database hiccup cannot
 * sign the whole platform out.
 */
export async function isCurrentAccountDeleted(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data, error } = await accountRpc("is_account_deleted", {});
  if (error !== null) {
    logger.warn("deleted account check failed", { message: error.message });
    return false;
  }

  return z.boolean().catch(false).parse(data);
}
