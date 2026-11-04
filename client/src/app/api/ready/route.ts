import { NextResponse } from "next/server";

import { env, isSupabaseConfigured } from "@/lib/env";

// Readiness reflects whether dependencies are reachable, for load balancers to
// route traffic. Liveness lives at /api/health.
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5_000;

export async function GET(): Promise<NextResponse> {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ status: "ok", checks: { supabase: "skipped" } });
  }

  try {
    // Sign-in is what the site needs Supabase for. The tables are read by the
    // API with its own key, and the public key is not allowed to read them, so
    // querying one here would report a healthy project as down.
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`auth settings answered ${response.status}`);
    return NextResponse.json({ status: "ok", checks: { supabase: "ok" } });
  } catch {
    return NextResponse.json(
      { status: "degraded", checks: { supabase: "error" } },
      { status: 503 },
    );
  }
}
