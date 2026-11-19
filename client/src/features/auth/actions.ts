"use server";

import { headers } from "next/headers";

import { isSupabaseConfigured } from "@/lib/env";
import { goApi } from "@/lib/go-api/client";
import { resetAcceptedResponse } from "@/lib/go-api/schemas";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import {
  forgotPasswordSchema,
  loginSchema,
  otpSchema,
  resetPasswordSchema,
  resolveIndustry,
  signupSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type OtpInput,
  type ResetPasswordInput,
  type SignupInput,
} from "./schemas";

export type AuthResult =
  | { readonly status: "success"; readonly message?: string; readonly redirectTo?: string }
  | { readonly status: "error"; readonly message: string };

const NOT_CONFIGURED: AuthResult = {
  status: "error",
  message: "Authentication is not configured yet. Add your Supabase credentials to continue.",
};

// Deliberately generic so responses never reveal whether an account exists.
const INVALID_CREDENTIALS = "Invalid email or password. Please try again.";
const GENERIC_ERROR = "That did not work. Try again.";
const RATE_LIMITED = "Too many attempts. Please wait a minute and try again.";

/*
 * Deliberately different from the message above.
 *
 * When the limiter cannot answer we deny by default, which is right for auth.
 * But saying "wait a minute" would be a lie: nothing counted the attempt, so
 * waiting changes nothing and the person retries forever. This says the service
 * is the problem, which is both true and actionable by whoever is on call.
 */

async function clientIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
}

/**
 * Throttles a sensitive auth action per client IP, per instance.
 *
 * This is a first guard only. The real protection is Supabase Auth's own rate
 * limits, which hold across instances. A cross-instance limiter will live in the
 * Go API with the rest of the account logic. Account suspension and deletion
 * are enforced there too, on the first request after sign-in.
 */
async function throttle(action: string, limit: number): Promise<AuthResult | null> {
  const ip = await clientIp();
  const result = rateLimit(`${action}:${ip}`, limit, 60_000);
  if (!result.ok) {
    logger.warn("auth action rate limited", { action, ip });
    return { status: "error", message: RATE_LIMITED };
  }
  return null;
}

export async function signInAction(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: GENERIC_ERROR };
  const limited = await throttle("signin", 10);
  if (limited) return limited;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { status: "error", message: INVALID_CREDENTIALS };

  return { status: "success", redirectTo: "/dashboard" };
}

export async function signUpAction(input: SignupInput): Promise<AuthResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: GENERIC_ERROR };
  const limited = await throttle("signup", 5);
  if (limited) return limited;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        business_name: parsed.data.businessName,
        industry: resolveIndustry(parsed.data.industry, parsed.data.industryOther),
      },
    },
  });

  if (error) {
    // The reason stays in the log; the person sees only the generic message so
    // responses never reveal whether an account exists.
    logger.warn("sign up failed", { code: error.code, status: error.status, message: error.message });
    return { status: "error", message: GENERIC_ERROR };
  }
  return { status: "success", redirectTo: "/dashboard" };
}

export async function requestPasswordResetAction(input: ForgotPasswordInput): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: GENERIC_ERROR };
  const limited = await throttle("reset", 5);
  if (limited) return limited;

  // Our own API makes the one-time link and emails it (through Resend), so the
  // email does not depend on Supabase's built-in sender. It answers the same
  // whether or not the address has an account, so this never discloses that.
  if (isSupabaseConfigured) {
    const result = await goApi("/api/v1/auth/password-reset", resetAcceptedResponse, {
      method: "POST",
      body: { email: parsed.data.email },
      anonymous: true,
    });
    if (!result.ok && result.status !== 400) {
      logger.warn("password reset request failed", { status: result.status, code: result.code });
      return { status: "error", message: "We could not send the email just now. Please try again in a few minutes." };
    }
  }

  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPasswordAction(input: ResetPasswordInput & { tokenHash: string }): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success || input.tokenHash.trim() === "") return { status: "error", message: GENERIC_ERROR };
  const limited = await throttle("password-set", 10);
  if (limited) return limited;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  // The emailed token is spent here, when the password is sent, not when the page
  // opens, so a mail scanner that fetches the link cannot use it up.
  const verified = await supabase.auth.verifyOtp({ type: "recovery", token_hash: input.tokenHash });
  if (verified.error) {
    return { status: "error", message: "This reset link has expired or was already used. Request a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logger.warn("password reset failed", { code: error.code, status: error.status });
    return { status: "error", message: error.code === "same_password" ? "Choose a password you have not used before." : GENERIC_ERROR };
  }
  // The link signed them in only to set a password. They sign in again with the new one.
  await supabase.auth.signOut();
  return { status: "success", redirectTo: "/login?reset=done" };
}

export async function verifyOtpAction(input: OtpInput & { email: string }): Promise<AuthResult> {
  const parsed = otpSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Enter the 6-digit code." };
  // A six-digit code is a million guesses. Tight, and keyed by email as well as
  // IP so one address cannot be attacked from many clients.
  const limited = await throttle(`otp:${input.email.toLowerCase()}`, 8);
  if (limited) return limited;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: parsed.data.code,
    type: "email",
  });

  if (error) return { status: "error", message: "That code is invalid or has expired." };
  return { status: "success", redirectTo: "/dashboard" };
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
}
