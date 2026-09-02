// The credit side of starting a run: hold the credits before the provider is
// called, and give them back if nothing came of it.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * The service-role client.
 *
 * `reserve_generation_credits` is service-role only by design: it charges an
 * account, so it must not be reachable under the account holder's own identity.
 * The same client settles the row, because the owner policies cover reading and
 * creating a generation but not updating one.
 */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export type Reservation =
  | { readonly held: true }
  /** Refused, with the reason to record on the row and return to the caller. */
  | { readonly held: false; readonly reason: string; readonly status: 402 | 500 };

/**
 * Takes the credits for a run, in the one statement that checks and debits.
 *
 * The gate the caller passed reads the balance and the provider request spends
 * it, and between those two the balance is only a number someone read. Two runs
 * started together both passed, both charged, and the account went negative.
 * Holding the credits here is what stops that, so nothing is dispatched until
 * they are actually held.
 */
export async function reserveCredits(
  admin: SupabaseClient,
  generationId: string,
): Promise<Reservation> {
  const { data, error } = await admin.rpc("reserve_generation_credits", {
    p_generation: generationId,
  });
  if (error) {
    return { held: false, reason: "Could not reserve the credits for this video", status: 500 };
  }
  if (data !== true) {
    return { held: false, reason: "Not enough credits left for this video", status: 402 };
  }
  return { held: true };
}

/**
 * Settles a run as failed and returns whatever it was holding.
 *
 * By id rather than by provider task id, because the whole point of reserving
 * before dispatch is that a run can now fail while it still has no task id.
 */
export async function abandonRun(
  admin: SupabaseClient,
  generationId: string,
  reason: string,
): Promise<boolean> {
  // False means the run had already settled, so nothing was refunded. Returned
  // rather than swallowed: a caller that announces a failure needs to know
  // whether one actually happened.
  const { data } = await admin.rpc("fail_generation_by_id", {
    p_generation: generationId,
    p_error: reason,
  });
  return data === true;
}
