import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

import { type Database } from "./types";

/**
 * Service-role Supabase client. Server-only; bypasses RLS, so it must never be
 * imported into client code. Used for the privileged prompt-engine RPCs
 * (`prompt_search`, learning store) which are granted to service_role only.
 */
export function createServiceClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
