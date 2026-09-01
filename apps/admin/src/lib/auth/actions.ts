"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AUTH_AUDIT_ACTIONS, recordAdminAction, recordRefusal } from "./audit";
import { clientIp } from "./request";
import { SIGN_IN_PATH, CONSOLE_HOME } from "./session";
import { createClient } from "./supabase";
import { throttleSignIn } from "./throttle";

export type SignInState = { status: "idle" } | { status: "error"; message: string };

// One message for a wrong password, an unknown address and a real account that
// is not an admin. Any difference between them is a way to enumerate who has
// access to the console.
const REFUSED = "Those details are not valid for this console.";

// Said the same way whether the IP or the account hit its limit, so the message
// cannot be used to work out which accounts exist or which are under attack.
const THROTTLED = "Too many sign-in attempts. Wait a few minutes and try again.";

/*
 * Deliberately different from the message above.
 *
 * When the limiter cannot answer we deny, which is right for auth. But saying
 * "wait a few minutes" would be a lie: nothing counted the attempt, so waiting
 * changes nothing and the person retries forever. This says the service is the
 * problem, which is both true and actionable by whoever is on call.
 */
const THROTTLE_UNAVAILABLE = "Sign-in is unavailable right now. Try again shortly.";

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

  // Counted before the password is checked, not after. A limiter that only
  // counts failures still lets an attacker make unlimited attempts as long as
  // the provider is the one refusing them.
  const refused = await throttleSignIn(ip, email);
  if (refused) {
    const unavailable = refused.outcome.reason === "unavailable";
    if (refused.audit) {
      await recordRefusal({
        action: AUTH_AUDIT_ACTIONS.signInThrottled,
        targetType: "admin_session",
        targetId: null,
        summary: unavailable
          ? "Sign-in denied because the rate limiter was unavailable"
          : "Sign-in refused by the rate limit",
        actorId: null,
        actorEmail: email,
        ip,
      });
    }
    return { status: "error", message: unavailable ? THROTTLE_UNAVAILABLE : THROTTLED };
  }

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
