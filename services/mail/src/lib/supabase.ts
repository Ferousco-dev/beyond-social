import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../config/env";

// Service-role client: mail_templates and mail_deliveries are readable by no
// other role, so this client is the only way into them.
export function createServiceClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
