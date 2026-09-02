"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AUTH_AUDIT_ACTIONS, recordAdminAction, type AuthAuditAction } from "./audit";
import { clientIp } from "./request";
import { CONSOLE_HOME } from "./session";
import { createClient } from "./supabase";

/**
 * Setting up and using a second factor.
 *
 * Enrolment is deliberately not gated on `ADMIN_REQUIRE_MFA`: an admin has to
 * be able to enrol and confirm it works *before* enforcement is switched on.
 * That ordering is the whole reason this can be turned on without locking
 * anyone out.
 */

const FACTOR_NAME = "Console authenticator";

/** TOTP codes are six digits. Rejecting anything else here keeps a typo from
 *  spending a verification attempt at the provider. */
const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the six digit code from your authenticator app.");

export type EnrolState =
  | { status: "idle" }
  | { status: "error"; message: string }
  /** A factor exists but is unverified until a code from it is accepted. The
   *  message carries a rejected attempt without discarding the QR code. */
  | {
      status: "pending";
      factorId: string;
      qrCode: string;
      secret: string;
      message?: string;
    };

export type VerifyState = { status: "idle" } | { status: "error"; message: string };

const GENERIC = "That did not work. Try again.";

/** Starts enrolment and returns what the authenticator app needs to scan. */
export async function beginEnrolAction(): Promise<EnrolState> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `${FACTOR_NAME} ${new Date().toISOString().slice(0, 10)}`,
  });

  if (error || !data) {
    return { status: "error", message: error?.message ?? GENERIC };
  }

  return {
    status: "pending",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/**
 * Confirms a newly enrolled factor with a code from it.
 *
 * A factor that is never confirmed stays unverified, and an unverified factor
 * does not raise the account to aal2. Without this step enrolment would look
 * finished and enforcement would still refuse the session.
 */
export async function confirmEnrolAction(
  _previous: EnrolState,
  formData: FormData,
): Promise<EnrolState> {
  const factorId = String(formData.get("factorId") ?? "");
  const qrCode = String(formData.get("qrCode") ?? "");
  const secret = String(formData.get("secret") ?? "");
  const pending = { status: "pending", factorId, qrCode, secret } as const;

  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!factorId) return { status: "error", message: GENERIC };
  if (!parsed.success) {
    return { ...pending, message: parsed.error.issues[0]?.message ?? GENERIC };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: parsed.data,
  });

  // The factor is still pending, so the form keeps its QR code rather than
  // making someone restart enrolment over a mistyped digit.
  if (error) return { ...pending, message: "That code was not accepted. Try the next one." };

  await record(AUTH_AUDIT_ACTIONS.mfaEnrolled, "Enrolled a second factor for the console");
  redirect(CONSOLE_HOME);
}

/** Steps an existing session up to aal2 using an already enrolled factor. */
export async function verifyFactorAction(
  _previous: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? GENERIC };
  }

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((candidate) => candidate.status === "verified");

  if (listError || !factor) {
    return { status: "error", message: "No authenticator is set up for this account." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: parsed.data,
  });
  if (error) return { status: "error", message: "That code was not accepted. Try the next one." };

  await record(AUTH_AUDIT_ACTIONS.mfaVerified, "Verified a second factor for the console");
  redirect(CONSOLE_HOME);
}

/** Audits a step-up. Never fatal: the factor is already verified by this point,
 *  and refusing the session over a log line would be its own lockout. */
async function record(action: AuthAuditAction, summary: string): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await recordAdminAction(supabase, {
      action,
      targetType: "admin_session",
      targetId: user.id,
      summary,
      ip: clientIp(await headers()),
    });
  } catch {
    // Deliberately swallowed. See the note above.
  }
}
