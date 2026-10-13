"use server";

import { z } from "zod";

import { goApi } from "@/lib/go-api/client";
import { createClient } from "@/lib/supabase/server";

/** The one irreversible thing a person can do to their own account. */

export type DeleteAccountResult =
  { readonly status: "ok" } | { readonly status: "error"; readonly message: string };

const deleteSchema = z.object({ confirmEmail: z.string().trim().min(1, "Type your account email to confirm.") });

export async function deleteAccount(input: z.input<typeof deleteSchema>): Promise<DeleteAccountResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Type your account email to confirm." };

  // The server checks the email again and refuses while a Pro subscription is running.
  const result = await goApi("/api/v1/me", z.unknown(), { method: "DELETE", body: { confirm_email: parsed.data.confirmEmail } });
  if (!result.ok) return { status: "error", message: result.message };

  // The sign-in is gone, so the session is only a stale cookie now.
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { status: "ok" };
}
