import { NextResponse, type NextRequest } from "next/server";

import { UNAVAILABLE_PATH, routeAvailability } from "@/lib/availability";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  switch (routeAvailability(request.nextUrl.pathname)) {
    case "api-unavailable":
      return NextResponse.json({ error: "feature_unavailable" }, { status: 503 });
    case "page-unavailable": {
      // Rewritten, not redirected, so the address bar keeps what was asked for.
      // The target sits inside the dashboard, which enforces sign-in itself.
      const url = request.nextUrl.clone();
      url.pathname = UNAVAILABLE_PATH;
      url.search = "";
      return NextResponse.rewrite(url, { status: 503 });
    }
    default:
      // API routes carry their own bearer-token checks and need no session refresh.
      return request.nextUrl.pathname.startsWith("/api/") ? NextResponse.next() : updateSession(request);
  }
}

export const config = {
  /**
   * Only the routes that need a session or that may be switched off.
   *
   * Marketing pages are left out so visiting them costs no Supabase round trip.
   * Being an allowlist is also what keeps the deleted-account redirect from
   * looping: `/account-deleted` is not listed. Do not broaden this to a
   * catch-all pattern.
   */
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/settings/:path*",
    "/api/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify",
  ],
};
