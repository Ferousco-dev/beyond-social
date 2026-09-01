import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { type AuthDatabase } from "./database";
import { env, serverEnv } from "./env";

export type AuthClient = SupabaseClient<AuthDatabase, "public">;

/**
 * Session-scoped client for Server Components, Route Handlers and Server
 * Actions. Identical cookie plumbing to the web app: the admin console is not a
 * second auth system, it reads the same session written by the same Supabase
 * project.
 */
export async function createClient(): Promise<AuthClient> {
  const cookieStore = await cookies();
  const publicEnv = env();

  return createServerClient<AuthDatabase>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Used for exactly one thing in this module: recording a
 * refused access attempt, which by definition has no admin session to write it.
 * It never carries a user session, so it must never be used to answer a
 * question about what the current visitor may see.
 */
export function createAuditWriter(): AuthClient {
  return createSupabaseClient<AuthDatabase>(
    env().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Service-role client for privileged reads the console is entitled to make.
 *
 * Distinct from `createAuditWriter` on purpose. That one exists to record a
 * refused access attempt, which has no session by definition, and its comment
 * rightly forbids using it to decide what a visitor may see. This one is for
 * data the database exposes to `service_role` alone, such as the learning
 * review queue, where there is no user-scoped path to the same rows.
 *
 * The rule that makes it safe is that every caller must have passed
 * `requireAdmin()` first: access control happens in the page, and this client
 * carries none of its own.
 */
export function createPrivilegedClient(): AuthClient {
  return createSupabaseClient<AuthDatabase>(
    env().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
