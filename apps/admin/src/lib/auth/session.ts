import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_AUDIT_ACTIONS, recordRefusal } from "./audit";
import { type AuthDatabase } from "./database";
import { env } from "./env";
import { notFoundResponse } from "./not-found";
import { clientIp } from "./request";

export const SIGN_IN_PATH = "/sign-in";
export const CONSOLE_HOME = "/overview";

/**
 * Refreshes the session and decides access for the whole console.
 *
 * Deny by default: every path is privileged except the sign-in screen, and
 * reaching one requires a session whose user passes `is_admin()` in the
 * database. The app never decides that for itself, so a mistake in a page
 * cannot widen access.
 */
export async function updateAdminSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const publicEnv = env();

  const supabase = createServerClient<AuthDatabase>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isSignIn = pathname === SIGN_IN_PATH;

  if (!user) {
    if (isSignIn) return response;
    const url = request.nextUrl.clone();
    url.pathname = SIGN_IN_PATH;
    url.search = "";
    // The requested path is kept so an admin lands where they were going, and
    // it is re-validated as an internal path before any redirect uses it.
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error || isAdmin !== true) {
    // Signed in but not an admin, including the sign-in screen itself: the
    // console does not confirm it exists to an account that cannot use it.
    await recordRefusal({
      action: AUTH_AUDIT_ACTIONS.accessDenied,
      targetType: "admin_route",
      targetId: pathname,
      summary: error
        ? `Access check failed for ${pathname}`
        : `Non-admin account requested ${pathname}`,
      actorId: user.id,
      actorEmail: user.email ?? "unknown",
      ip: clientIp(request.headers),
    });
    return notFoundResponse();
  }

  if (isSignIn) {
    const url = request.nextUrl.clone();
    url.pathname = CONSOLE_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
