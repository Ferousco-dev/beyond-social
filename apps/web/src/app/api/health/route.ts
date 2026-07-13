import { NextResponse } from "next/server";
import { z } from "zod";

// Health checks must always reflect live process state, never a cached render.
export const dynamic = "force-dynamic";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("web"),
  timestamp: z.string().datetime(),
});

type HealthResponse = z.infer<typeof healthResponseSchema>;

export function GET(): NextResponse<HealthResponse> {
  const body = healthResponseSchema.parse({
    status: "ok",
    service: "web",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(body);
}
