import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { env, isSupabaseConfigured } from "@/lib/env";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/editor"] as const;
const AUTH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
] as const;

/**
 * Where a deleted session is sent. Deliberately outside the matcher in
 * `middleware.ts`, so this middleware never runs on it and the redirect cannot
 * chase its own tail.
 */
export const ACCOUNT_DELETED_PATH = "/account-deleted";

/**
 * Proof that this account was found live recently, so the deletion check does
 * not cost a database round trip on every navigation.
 *
 * Signed, not merely written. An unsigned marker would let a deleted session
 * keep itself alive by rewriting the cookie, which turns the check into a
 * suggestion. The signature covers the expiry and the user id, so the mark
 * cannot be extended, and cannot be carried to another account.
 */
const LIVE_COOKIE = "bs-account-live";
const LIVE_TTL_MS = 5 * 60_000;
const SIGNING_LABEL = "account-deletion-cache.v1";

// Any high-entropy server-only value works as key material, and one that already
// exists in every deployment cannot be forgotten in an environment. The label
// domain-separates this use from the key's real one.
const signingSecret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const encoder = new TextEncoder();
let signingKey: Promise<CryptoKey> | undefined;

function hmacKey(): Promise<CryptoKey> {
  signingKey ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(`${SIGNING_LABEL}:${signingSecret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return signingKey;
}

async function sign(payload: string): Promise<string> {
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hasLiveMark(request: NextRequest, userId: string): Promise<boolean> {
  // No secret, no cache. Absence of key material costs latency, never enforcement.
  if (signingSecret === "") return false;

  const raw = request.cookies.get(LIVE_COOKIE)?.value;
  if (raw === undefined) return false;

  const split = raw.lastIndexOf(".");
  if (split < 1) return false;

  const expiresAt = Number(raw.slice(0, split));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  return equals(raw.slice(split + 1), await sign(`${userId}.${expiresAt}`));
}

async function setLiveMark(response: NextResponse, request: NextRequest, userId: string) {
  if (signingSecret === "") return;
  const expiresAt = Date.now() + LIVE_TTL_MS;
  response.cookies.set(LIVE_COOKIE, `${expiresAt}.${await sign(`${userId}.${expiresAt}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: LIVE_TTL_MS / 1000,
  });
}

/**
 * `is_account_deleted` (0042) is not in the generated database types yet, so the
 * cast is confined here and the payload stays `unknown`, forcing the parse below.
 */
type DeletionRpc = {
  rpc: (fn: "is_account_deleted", args: Record<string, never>) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

type AccountState = "live" | "deleted" | "unknown";

async function accountState(
  request: NextRequest,
  supabase: DeletionRpc,
  userId: string,
): Promise<{ state: AccountState; cached: boolean }> {
  if (await hasLiveMark(request, userId)) return { state: "live", cached: true };

  const { data, error } = await supabase.rpc("is_account_deleted", {});
  if (error !== null) {
    // A database hiccup must not sign the whole platform out, so an unreadable
    // answer is not treated as deletion, and is not cached either. The app's
    // structured logger writes to process.stderr, which the edge runtime lacks.
    console.warn(`[middleware] deleted account check failed: ${error.message}`);
    return { state: "unknown", cached: false };
  }

  return { state: z.boolean().catch(false).parse(data) ? "deleted" : "live", cached: false };
}

/**
 * Refreshes the Supabase session on every request and enforces route access:
 * unauthenticated users are redirected away from protected routes, signed-in
 * users are redirected away from the auth screens, and a deleted account is
 * signed out and sent to `ACCOUNT_DELETED_PATH`.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Before Supabase is configured the app is public; skip session handling.
  if (!isSupabaseConfigured) {
    return response;
  }

  // Cookie writes are replayed onto redirects too. Without this, a request that
  // both refreshes the token and redirects drops the rotated refresh token.
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
            pending.push({ name, value, options: { ...options } });
          }
        },
      },
    },
  );

  const redirect = (pathname: string, redirectTo?: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (redirectTo !== undefined) url.searchParams.set("redirect", redirectTo);
    const result = NextResponse.redirect(url);
    for (const { name, value, options } of pending) result.cookies.set(name, value, options);
    return result;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user) {
    return isProtected ? redirect("/login", pathname) : response;
  }

  const { state, cached } = await accountState(request, supabase as unknown as DeletionRpc, user.id);

  if (state === "deleted") {
    // Checked before the auth-route bounce, so a deleted session landing on
    // /login is told what is wrong instead of being sent to a dashboard it is
    // about to be thrown out of. signOut revokes the refresh token upstream, so
    // the lockout survives any other device holding the same session.
    await supabase.auth.signOut();
    const result = redirect(ACCOUNT_DELETED_PATH);
    result.cookies.delete(LIVE_COOKIE);
    return result;
  }

  if (isAuthRoute) return redirect("/dashboard");
  if (state === "live" && !cached) await setLiveMark(response, request, user.id);

  return response;
}
