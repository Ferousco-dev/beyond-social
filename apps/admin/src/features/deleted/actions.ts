"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";

import { type RestoreActionState } from "./action-state";
import { restoreAccount } from "./rpc";
import { restoreSchema } from "./schema";

/**
 * Restores a deleted account, which is the only way back from a deletion.
 *
 * A thin wrapper: `admin_restore_account` re-checks that the caller is an
 * admin, refuses an account that is not deleted, and writes the audit row in
 * the same transaction as the change. So this action is a convenience for the
 * dialog, never the security boundary.
 *
 * There is no erase action here, and that absence is deliberate. An
 * irreversible bulk delete is the owner's decision to ship, not something to
 * leave behind a confirm dialog in the meantime.
 */
export async function restoreAccountAction(
  _previous: RestoreActionState,
  formData: FormData,
): Promise<RestoreActionState> {
  await requireAdmin();

  const input = restoreSchema.safeParse({ userId: formData.get("userId") });
  if (!input.success) {
    return { status: "error", message: "That account could not be identified. Reload and retry." };
  }

  const result = await restoreAccount(input.data.userId);
  if (!result.ok) {
    return { status: "error", message: `Nothing was changed. ${result.message}` };
  }

  revalidatePath("/deleted");
  revalidatePath("/users");
  return {
    status: "ok",
    message: "Account restored. It can sign in and reach its work again.",
  };
}
