import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/api/authenticate";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Public API: list a caller's generations.
 *
 * Versioned under /api/v1 so the shape can change later without breaking
 * integrations. Authentication is by API key; there is no cookie path here, so
 * a browser session cannot be used to call it cross-site.
 */
export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request): Promise<NextResponse> {
  const caller = await authenticateRequest(request);
  if (!caller) {
    return NextResponse.json(
      { error: "unauthorized", message: "Provide a valid API key as a bearer token." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ limit: url.searchParams.get("limit") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", message: "limit must be between 1 and 100." },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("video_generations")
    .select("id, prompt, status, result_url, aspect_ratio, created_at")
    .eq("user_id", caller.userId)
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ object: "list", data: data ?? [] });
}
