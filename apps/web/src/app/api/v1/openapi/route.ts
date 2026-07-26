import { NextResponse } from "next/server";

import { buildOpenApiDocument } from "@/lib/api/openapi";

/**
 * The API description. Deliberately unauthenticated: a spec that requires a key
 * to read cannot be used to decide whether to get a key.
 */
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json(buildOpenApiDocument());
}
