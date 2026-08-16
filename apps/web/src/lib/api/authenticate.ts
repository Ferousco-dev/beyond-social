import "server-only";
import { z } from "zod";

import { hasIntegrations } from "@/lib/billing/entitlements";
import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

import { hashApiKey, readBearerKey } from "./keys";

export interface ApiCaller {
  userId: string;
  /** The plan the key belongs to, which decides whether the key may be used at all. */
  plan: string;
}

const profileSchema = z.object({ deleted_at: z.string().nullable(), plan: z.string() });

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
 *
 * The plan is read here for the same reason. A key minted on a paid plan
 * outlives the subscription that justified it, so the entitlement has to be
 * checked per request against the account as it is now, not as it was when the
 * key was created.
 */
export async function authenticateRequest(request: Request): Promise<ApiCaller | null> {
  if (!isSupabaseConfigured) return null;

  const key = readBearerKey(request);
  if (!key) return null;

  const service = createServiceClient();
  const { data, error } = await service.rpc("api_key_owner", { p_hash: hashApiKey(key) });
  if (error || typeof data !== "string" || data.length === 0) return null;

  const probe = await service
    .from("profiles")
    .select("deleted_at, plan")
    .eq("id", data)
    .maybeSingle();

  // An unreadable profile is not proof the account is live, and an API caller
  // has no session to fall back on, so this one fails closed.
  if (probe.error !== null) return null;
  const profile = profileSchema.safeParse(probe.data);
  if (!profile.success || profile.data.deleted_at !== null) return null;

  return { userId: data, plan: profile.data.plan };
}

/**
 * Whether the key's account is on a plan that includes the API.
 *
 * Separate from authentication because the two failures are different answers:
 * a bad key is 401 and there is nothing to do about it, while a valid key on
 * the wrong plan is 403 and the remedy is an upgrade. Collapsing them into
 * "unauthorized" would send a paying customer hunting for a credential problem
 * that does not exist.
 */
export function callerMayUseApi(caller: ApiCaller): boolean {
  return hasIntegrations(caller.plan);
}
