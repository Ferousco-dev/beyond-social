import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Only same-origin paths are followed after sign-in.
 *
 * Concatenating this onto the origin does not currently produce an off-site
 * redirect, but a destination taken from a query parameter is a well-known
 * footgun and the check costs nothing.
 */
function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}

/**
 * OAuth and email-confirmation callback. Exchanges the returned code for a
 * session, then forwards the user to their intended destination.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  if (code && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
