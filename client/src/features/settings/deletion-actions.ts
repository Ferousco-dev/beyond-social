"use server";

import { z } from "zod";

import { requestAccountDeletion } from "@/lib/account/deletion";
import { deletionRequestSchema } from "@/lib/account/types";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

/** The one irreversible thing a person can do to their own account. */

export type DeleteAccountResult =
  { readonly status: "ok" } | { readonly status: "error"; readonly message: string };

const CONFIRM_MISMATCH = "Type your account email exactly to confirm.";
const SIGNED_OUT = "Sign in again to delete your account.";

const deleteAccountSchema = deletionRequestSchema.extend({
  // The friction, not the authorisation: the database checks who is asking.
  // This only makes sure the person meant to do it.
  confirmEmail: z.string().trim().min(1, CONFIRM_MISMATCH),
});

export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;

export async function deleteAccount(input: DeleteAccountInput): Promise<DeleteAccountResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? CONFIRM_MISMATCH };
  }

  const user = await getAuthUser();
  if (!user?.email) return { status: "error", message: SIGNED_OUT };

  // Confirmed server side as well as in the form, because the client check is
  // a courtesy and the action is reachable without it.
  if (parsed.data.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return { status: "error", message: CONFIRM_MISMATCH };
  }

  const result = await requestAccountDeletion({ reason: parsed.data.reason });
  if (result.status === "error") return { status: "error", message: result.message };

  // Ending the session is the point, not the tidy-up: from the moment the flag
  // is set the account can no longer read its own rows, so a live session would
  // only produce empty screens and permission errors.
  const supabase = await createClient();
  await supabase.auth.signOut();

  return { status: "ok" };
}
