import "server-only";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

import { hashApiKey, readBearerKey } from "./keys";

export interface ApiCaller {
  userId: string;
}

/**
 * `profiles.deleted_at` (0042) is not in the generated database types yet, so
 * the read goes through a narrow seam and the payload stays `unknown`, which
 * forces the parse below. Remove this and select the column directly once the
 * types are regenerated.
 */
type DeletionProbe = {
  from: (table: "profiles") => {
    select: (columns: "deleted_at") => {
      eq: (
        column: "id",
        value: string,
      ) => {
        maybeSingle: () => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

const deletionSchema = z.object({ deleted_at: z.string().nullable() });

/**
 * Authenticates a public API request by its key. Returns null for anything
 * unauthenticated, so routes fail closed by construction rather than by
 * remembering to check.
 *
 * The deletion check lives here rather than in the routes because these routes
 * read with the service role, which bypasses RLS. The restrictive policies that
 * lock a deleted account out of the browser are invisible to them, so without
 * this a revoked-by-deletion account keeps full read access to its own data
 * through any key it minted beforehand. Suspension is deliberately not checked:
 * a suspended account is stopped from writing, not from reading.
 */
export async function authenticateRequest(request: Request): Promise<ApiCaller | null> {
  if (!isSupabaseConfigured) return null;

  const key = readBearerKey(request);
  if (!key) return null;

  const service = createServiceClient();
  const { data, error } = await service.rpc("api_key_owner", { p_hash: hashApiKey(key) });
  if (error || typeof data !== "string" || data.length === 0) return null;

  const probe = await (service as unknown as DeletionProbe)
    .from("profiles")
    .select("deleted_at")
    .eq("id", data)
    .maybeSingle();

  // An unreadable profile is not proof the account is live, and an API caller
  // has no session to fall back on, so this one fails closed.
  if (probe.error !== null) return null;
  const profile = deletionSchema.safeParse(probe.data);
  if (!profile.success || profile.data.deleted_at !== null) return null;

  return { userId: data };
}
