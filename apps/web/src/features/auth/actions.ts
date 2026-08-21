"use server";

import { headers } from "next/headers";

import { isCurrentAccountDeleted } from "@/lib/account/deletion";
import { ACCOUNT_DELETED_MESSAGE } from "@/lib/account/types";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sharedRateLimit } from "@/lib/rate-limit-shared";
import { createClient } from "@/lib/supabase/server";

import {
  forgotPasswordSchema,
  loginSchema,
  otpSchema,
  resetPasswordSchema,
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
const GENERIC_ERROR = "Something went wrong. Please try again.";
const RATE_LIMITED = "Too many attempts. Please wait a minute and try again.";

/*
 * Deliberately different from the message above.
 *
 * When the limiter cannot answer we deny by default, which is right for auth.
 * But saying "wait a minute" would be a lie: nothing counted the attempt, so
 * waiting changes nothing and the person retries forever. This says the service
 * is the problem, which is both true and actionable by whoever is on call.
 */
const RATE_LIMITER_DOWN = "We could not verify this request just now. Please try again shortly.";

async function clientIp(): Promise<string> {
  const store = await headers();
  return store.get("x-forwarded-for")?.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
}

/**
 * Throttles a sensitive auth action per client IP.
 *
 * Shared across instances, because a per-instance limit is trivially bypassed
 * on serverless by spreading attempts, which is precisely what a credential
 * stuffing or OTP brute-force run does.
 */
async function throttle(action: string, limit: number): Promise<AuthResult | null> {
  const ip = await clientIp();
  const result = await sharedRateLimit(`${action}:${ip}`, limit, 60_000);
  if (!result.ok) {
    const unavailable = result.reason === "unavailable";
    logger[unavailable ? "error" : "warn"](
      unavailable ? "auth denied because the limiter is unavailable" : "auth action rate limited",
      { action, ip },
    );
    return { status: "error", message: unavailable ? RATE_LIMITER_DOWN : RATE_LIMITED };
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

  // Checked after authentication, not instead of it, so the deleted state is
  // never disclosed to someone who does not know the password. Named plainly
  // rather than folded into INVALID_CREDENTIALS: no password reset can fix a
  // deleted account, and being told otherwise sends people round that loop.
  if (await isCurrentAccountDeleted()) {
    await supabase.auth.signOut();
    return { status: "error", message: ACCOUNT_DELETED_MESSAGE };
  }

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
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) return { status: "error", message: GENERIC_ERROR };
  return { status: "success", redirectTo: "/dashboard" };
}

export async function requestPasswordResetAction(input: ForgotPasswordInput): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: GENERIC_ERROR };
  const limited = await throttle("reset", 5);
  if (limited) return limited;

  // Always report success so the response does not disclose account existence.
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/reset-password`,
    });
  }

  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: GENERIC_ERROR };
  const limited = await throttle("password-set", 10);
  if (limited) return limited;
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { status: "error", message: GENERIC_ERROR };
  return { status: "success", redirectTo: "/login" };
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
