import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Readiness reflects whether dependencies are reachable, for load balancers to
// route traffic. Liveness lives at /api/health.
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ status: "ok", checks: { supabase: "skipped" } });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", checks: { supabase: "ok" } });
  } catch {
    return NextResponse.json(
      { status: "degraded", checks: { supabase: "error" } },
      { status: 503 },
    );
  }
}
