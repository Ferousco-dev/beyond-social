import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface CreditSpendPoint {
  day: string;
  creditsSpent: number;
}

const spendPointSchema = z.object({
  day: z.string(),
  credits_spent: z.coerce.number(),
});

/** One account's credit spend per day over the window. Empty on error. */
export async function getUserCreditSpendDaily(
  userId: string,
  days = 30,
): Promise<CreditSpendPoint[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_credit_spend_daily", {
    p_user: userId,
    p_days: days,
  });
  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = spendPointSchema.safeParse(row);
    return parsed.success ? [{ day: parsed.data.day, creditsSpent: parsed.data.credits_spent }] : [];
  });
}

export interface CreditSpendByModel {
  provider: string;
  model: string;
  generations: number;
  creditsSpent: number;
}

const spendByModelSchema = z.object({
  provider: z.string(),
  model: z.string(),
  generations: z.coerce.number(),
  credits_spent: z.coerce.number(),
});

/** One account's credit spend by provider/model over the window, most expensive first. */
export async function getUserCreditSpendByModel(
  userId: string,
  days = 30,
): Promise<CreditSpendByModel[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_user_credit_spend_by_model", {
    p_user: userId,
    p_days: days,
  });
  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = spendByModelSchema.safeParse(row);
    if (!parsed.success) return [];
    return [
      {
        provider: parsed.data.provider,
        model: parsed.data.model,
        generations: parsed.data.generations,
        creditsSpent: parsed.data.credits_spent,
      },
    ];
  });
}
