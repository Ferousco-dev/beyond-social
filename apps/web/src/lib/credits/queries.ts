import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { type RunCheck, runCheckSchema } from "./types";

/**
 * The caller's balance, summed from `credit_ledger`, which is the source of
 * truth. `profiles.credits_total` / `credits_used` are a cache the ledger
 * maintains; read them for the "used this much of that much" display, never to
 * decide whether a run may proceed.
 */
export async function getCreditBalance(): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("credit_balance");
  if (error !== null) return 0;

  return z.coerce.number().int().catch(0).parse(data);
}

/**
 * Both dials, checked server-side. A denial always names which one failed, so
 * the composer can offer the right remedy: upgrade, or top up.
 */
export async function canRunModel(modelId: string): Promise<RunCheck> {
  const denied = (reason: "unknown_model" | "not_authenticated"): RunCheck => ({
    allowed: false,
    reason,
    creditCost: 0,
    balance: 0,
  });

  if (!isSupabaseConfigured) return denied("not_authenticated");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_run_model", { p_model: modelId });
  if (error !== null) return denied("unknown_model");

  const parsed = runCheckSchema.array().nonempty().safeParse(data);
  if (!parsed.success) return denied("unknown_model");

  const row = parsed.data[0];
  return row.allowed && row.reason === "ok"
    ? { allowed: true, creditCost: row.credit_cost, balance: row.balance }
    : {
        allowed: false,
        // `ok` cannot reach here: the function only reports it when allowed.
        reason: row.reason === "ok" ? "unknown_model" : row.reason,
        creditCost: row.credit_cost,
        balance: row.balance,
      };
}
