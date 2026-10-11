import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface ModelPricingRow {
  id: string;
  provider: string;
  name: string;
  family: string;
  creditCost: number;
  minPlan: string;
  isActive: boolean;
  updatedAt: string;
}

const modelPricingRowSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  family: z.string(),
  credit_cost: z.coerce.number(),
  min_plan: z.string(),
  is_active: z.boolean(),
  updated_at: z.string(),
});

function toRow(row: z.infer<typeof modelPricingRowSchema>): ModelPricingRow {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    family: row.family,
    creditCost: row.credit_cost,
    minPlan: row.min_plan,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

/** Every model, including inactive ones, for the admin pricing table. Empty on error. */
export async function getModelPricing(): Promise<ModelPricingRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_model_pricing_list");
  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = modelPricingRowSchema.safeParse(row);
    return parsed.success ? [toRow(parsed.data)] : [];
  });
}
