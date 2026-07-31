import "server-only";

import { createClient } from "@/lib/auth/supabase";

import { type AnalyticsClient } from "./rpc";

/**
 * The caller's own session, adapted to the shape the analytics reads need.
 *
 * The session client is used deliberately rather than the service role: every
 * analytics function gates on `is_admin()` in the database, so a page that
 * somehow rendered for the wrong person gets an error instead of platform
 * totals. The cast is only about function names, which the console's
 * hand-written database type does not enumerate; every row is still validated
 * by a Zod schema before it reaches a component.
 */
export async function createAnalyticsClient(): Promise<AnalyticsClient> {
  return (await createClient()) as unknown as AnalyticsClient;
}
