import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /**
   * Only the routes that actually need a session.
   *
   * This used to run on everything except static assets, which meant every
   * navigation to the landing page, pricing, or any marketing page made a
   * `getUser()` call to Supabase before rendering a page that does not know or
   * care who is looking at it. That is a network round trip per navigation, paid
   * on the pages most visitors see first.
   *
   * The protected prefixes still need it, because that is where access is
   * decided, and the auth pages need it to bounce an already-signed-in user.
   */
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify",
  ],
};
