import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

import { type Database } from "./types";

/**
 * Supabase client for use in Client Components. A new instance is cheap and
 * avoids sharing auth state across users during SSR.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
