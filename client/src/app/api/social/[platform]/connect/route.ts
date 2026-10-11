import { NextResponse } from "next/server";

import { withTrace } from "@/lib/observability/http";
import {
  OAUTH_COOKIE_MAX_AGE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  buildAuthorizeUrl,
  newState,
  newVerifier,
} from "@/lib/social/oauth";
import { isPlatformConfigured, isSocialPlatform, platformConfig } from "@/lib/social/platforms";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/** Starts the OAuth handshake for one platform. */
export const dynamic = "force-dynamic";

export const GET = withTrace("GET /api/social/[platform]/connect", async (request) => {
  const platform = new URL(request.url).pathname.split("/").at(-2) ?? "";
  if (!isSocialPlatform(platform)) {
    return NextResponse.json({ error: "unknown_platform" }, { status: 404 });
  }
  if (!isPlatformConfigured(platform)) {
    return NextResponse.json(
      { error: "not_configured", message: `${platformConfig(platform).label} is not set up yet.` },
      { status: 503 },
    );
  }

  // Connecting binds an account to a user, so it requires a session. Without
  // this check an anonymous visitor could start a flow whose callback has no
  // owner to attach the tokens to.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", env.NEXT_PUBLIC_APP_URL));

  const state = newState();
  const verifier = platformConfig(platform).usesPkce ? newVerifier() : undefined;

  const response = NextResponse.redirect(
    buildAuthorizeUrl({ platform, appUrl: env.NEXT_PUBLIC_APP_URL, state, verifier }),
  );

  // httpOnly so script cannot read them, sameSite lax so they survive the
  // provider's redirect back, which is a top-level GET.
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  } as const;
  response.cookies.set(STATE_COOKIE, `${platform}:${state}`, options);
  if (verifier) response.cookies.set(VERIFIER_COOKIE, verifier, options);

  return response;
});
