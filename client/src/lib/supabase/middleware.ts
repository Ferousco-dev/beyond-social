import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
 * Refreshes the Supabase session on every request and enforces route access:
 * unauthenticated users are redirected away from protected routes
 * and signed-in users are redirected away from the auth screens. Whether an
 * account is suspended or deleted is decided by the Go API, which the dashboard
 * asks for the current user.
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

  if (isAuthRoute) return redirect("/dashboard");
  return response;
}
