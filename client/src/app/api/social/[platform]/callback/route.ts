import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { withTrace } from "@/lib/observability/http";
import { STATE_COOKIE, VERIFIER_COOKIE, exchangeCode, statesMatch } from "@/lib/social/oauth";
import { isPlatformConfigured, isSocialPlatform } from "@/lib/social/platforms";
import { saveConnection } from "@/lib/social/connections";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/** Completes the OAuth handshake and stores the connection. */
export const dynamic = "force-dynamic";

const SETTINGS = "/dashboard/settings/connections";

function back(status: string, platform: string): NextResponse {
  const url = new URL(SETTINGS, env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("status", status);
  url.searchParams.set("platform", platform);
  return NextResponse.redirect(url);
}

export const GET = withTrace("GET /api/social/[platform]/callback", async (request) => {
  const url = new URL(request.url);
  const platform = url.pathname.split("/").at(-2) ?? "";
  if (!isSocialPlatform(platform) || !isPlatformConfigured(platform)) {
    return back("unknown", platform);
  }

  // A user who declines consent comes back with an error, not a code. That is
  // an ordinary outcome, not a failure worth logging as one.
  if (url.searchParams.get("error")) return back("cancelled", platform);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === STATE_COOKIE)?.[1];

  // The cookie carries the platform too, so a state minted for one platform
  // cannot be replayed against another.
  const [cookiePlatform, cookieState] = decodeURIComponent(cookie ?? "").split(":");
  if (!code || !state || !cookieState || cookiePlatform !== platform) {
    return back("invalid_state", platform);
  }
  if (!statesMatch(state, cookieState)) return back("invalid_state", platform);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", env.NEXT_PUBLIC_APP_URL));

  const verifier = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === VERIFIER_COOKIE)?.[1];

  try {
    const token = await exchangeCode({
      platform,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      code,
      verifier: verifier ? decodeURIComponent(verifier) : undefined,
    });
    await saveConnection(user.id, platform, token);
  } catch (error) {
    logger.error("social connect failed", {
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return back("failed", platform);
  }

  const response = back("connected", platform);
  // The single-use values are spent; leaving them set would widen the replay
  // window for nothing.
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(VERIFIER_COOKIE);
  return response;
});
