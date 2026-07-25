import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../config/env";

// Service-role client: used only inside the worker, never exposed to clients.
export function createServiceClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
