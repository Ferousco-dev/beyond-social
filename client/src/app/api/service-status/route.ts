import { NextResponse } from "next/server";

import { env } from "@/lib/env";

// Tells the banner whether the pieces behind the app are answering. It reports
// only up or down, so it is safe to leave open to anyone.
export const dynamic = "force-dynamic";

// A server that has been asleep can take a while to wake, so give it time.
const TIMEOUT_MS = 12_000;

async function answers(url: string, headers: Record<string, string> = {}): Promise<boolean> {
  try {
    const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(): Promise<NextResponse> {
  const api = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  const [apiUp, signInUp] = await Promise.all([
    api === "" ? true : answers(`${api}/ready`),
    env.NEXT_PUBLIC_SUPABASE_URL === ""
      ? true
      : answers(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY }),
  ]);
  return NextResponse.json({ ok: apiUp && signInUp }, { headers: { "Cache-Control": "no-store" } });
}
