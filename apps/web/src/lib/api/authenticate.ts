import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

import { hashApiKey, readBearerKey } from "./keys";

export interface ApiCaller {
  userId: string;
}

/**
 * Authenticates a public API request by its key. Returns null for anything
 * unauthenticated, so routes fail closed by construction rather than by
 * remembering to check.
 */
export async function authenticateRequest(request: Request): Promise<ApiCaller | null> {
  if (!isSupabaseConfigured) return null;

  const key = readBearerKey(request);
  if (!key) return null;

  const service = createServiceClient();
  const { data, error } = await service.rpc("api_key_owner", { p_hash: hashApiKey(key) });
  if (error || typeof data !== "string" || data.length === 0) return null;
  return { userId: data };
}
