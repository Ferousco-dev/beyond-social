"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AUTH_AUDIT_ACTIONS, recordAdminAction, recordRefusal } from "./audit";
import { clientIp } from "./request";
import { SIGN_IN_PATH, CONSOLE_HOME } from "./session";
import { createClient } from "./supabase";

export type SignInState = { status: "idle" } | { status: "error"; message: string };

// One message for a wrong password, an unknown address and a real account that
// is not an admin. Any difference between them is a way to enumerate who has
// access to the console.
const REFUSED = "Those details are not valid for this console.";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  redirectTo: z.string().optional(),
});

/** Internal paths only. A caller-supplied absolute URL is an open redirect. */
function safeDestination(candidate: string | undefined): string {
  if (!candidate) return CONSOLE_HOME;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return CONSOLE_HOME;
  return candidate === SIGN_IN_PATH ? CONSOLE_HOME : candidate;
}

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? REFUSED };
  }

  const { email, password, redirectTo } = parsed.data;
  const ip = clientIp(await headers());
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordRefusal({
      action: AUTH_AUDIT_ACTIONS.signInFailed,
      targetType: "admin_session",
      targetId: null,
      summary: "Sign-in rejected by Supabase Auth",
      actorId: null,
      // Attacker-supplied and recorded as such: this is the address that was
      // tried, not a verified identity.
      actorEmail: email,
      ip,
    });
    return { status: "error", message: REFUSED };
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");

  if (roleError || isAdmin !== true) {
    await supabase.auth.signOut();
    await recordRefusal({
      action: AUTH_AUDIT_ACTIONS.signInDenied,
      targetType: "admin_session",
      targetId: data.user.id,
      summary: roleError
        ? "Role check failed during sign-in"
        : "Valid credentials for a non-admin account",
      actorId: data.user.id,
      actorEmail: data.user.email ?? email,
      ip,
    });
    return { status: "error", message: REFUSED };
  }

  try {
    await recordAdminAction(supabase, {
      action: AUTH_AUDIT_ACTIONS.signIn,
      targetType: "admin_session",
      targetId: data.user.id,
      summary: "Signed in to the admin console",
      ip,
    });
  } catch {
    // An admin session that left no trace is worse than no session.
    await supabase.auth.signOut();
    return { status: "error", message: "Sign-in could not be recorded. Try again." };
  }

  redirect(safeDestination(redirectTo));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Logged before the session ends, while the caller is still an admin and
    // `admin_log_action` will accept the write.
    await recordAdminAction(supabase, {
      action: AUTH_AUDIT_ACTIONS.signOut,
      targetType: "admin_session",
      targetId: user.id,
      summary: "Signed out of the admin console",
      ip: clientIp(await headers()),
    });
  }

  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}
