import "server-only";

import { z } from "zod";

import { getCurrentPlan } from "@/lib/billing/current-plan";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { getCreditBalance } from "@/lib/credits/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { listModels } from "@/lib/models/catalog";
import { MODEL_FAMILIES, type ModelFamily } from "@/lib/models/types";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

import { type MarketModel, type ModelAccess } from "./types";

const preferenceRowSchema = z.object({
  family: z.enum(MODEL_FAMILIES),
  model_id: z.string(),
});

/**
 * `PLANS` is ordered cheapest first, so its index is the tier rank. It mirrors
 * `public.plan_rank`, which is the one that actually gates a run; keeping the
 * order here rather than a second lookup table is what stops the two drifting.
 */
function planRank(plan: PlanId): number {
  return PLANS.indexOf(plan);
}

function resolveAccess(
  minPlan: PlanId,
  creditCost: number,
  plan: PlanId,
  balance: number,
): ModelAccess {
  if (planRank(plan) < planRank(minPlan)) return { state: "locked", requiredPlan: minPlan };
  if (balance < creditCost) return { state: "no_credits", balance };
  return { state: "ready" };
}

function asPlanId(value: string): PlanId {
  return (PLANS as readonly string[]).includes(value) ? (value as PlanId) : "free";
}

/** The user's stored default per family, keyed for a cheap lookup per card. */
async function getPreferences(): Promise<ReadonlyMap<ModelFamily, string>> {
  if (!isSupabaseConfigured) return new Map();

  const user = await getAuthUser();
  if (!user) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_model_preferences")
    .select("family, model_id")
    .eq("user_id", user.id);
  if (error !== null || data === null) return new Map();

  const parsed = preferenceRowSchema.array().safeParse(data);
  if (!parsed.success) return new Map();

  return new Map(parsed.data.map((row) => [row.family, row.model_id]));
}

export interface MarketData {
  readonly models: readonly MarketModel[];
  readonly plan: PlanId;
  readonly balance: number;
}

/**
 * Everything the market renders, in one round of queries. Exactly the rows the
 * catalogue holds: there is no padding, no "coming soon" placeholder, so an
 * empty grid means the catalogue is empty.
 */
export async function getMarketData(): Promise<MarketData> {
  const [catalogue, planValue, balance, preferences] = await Promise.all([
    listModels(),
    getCurrentPlan(),
    getCreditBalance(),
    getPreferences(),
  ]);

  const plan = asPlanId(planValue);

  return {
    plan,
    balance,
    models: catalogue.map((model) => ({
      ...model,
      access: resolveAccess(model.minPlan, model.creditCost, plan, balance),
      isPreferred: preferences.get(model.family) === model.id,
    })),
  };
}
