import { type NextRequest, type NextResponse } from "next/server";

import { updateAdminSession } from "@/lib/auth/session";

export function middleware(request: NextRequest): Promise<NextResponse> {
  return updateAdminSession(request);
}

export const config = {
  /**
   * Everything except the framework's own static output.
   *
   * The web app narrows its matcher for speed, because most of its traffic is
   * marketing pages that do not need a session. The console has no public
   * surface at all, so the matcher is the deny-by-default boundary and must not
   * leave gaps: a path that skips the middleware is a path with no access
   * control.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
