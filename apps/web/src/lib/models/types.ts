import { z } from "zod";

import { PLANS, type PlanId } from "@/lib/billing/plans";

/**
 * The model catalogue as the app sees it. The database is the source of truth
 * for price and tier, so everything here parses what came back rather than
 * restating it: a price change is a row update, and this layer must not need a
 * deploy to agree with it.
 */

export const MODEL_FAMILIES = ["video", "image", "chat", "audio"] as const;
export type ModelFamily = (typeof MODEL_FAMILIES)[number];

export const modelRowSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  family: z.enum(MODEL_FAMILIES),
  description: z.string(),
  capabilities: z.array(z.string()),
  credit_cost: z.number().int().nonnegative(),
  min_plan: z.enum(PLANS),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

export interface CatalogModel {
  readonly id: string;
  readonly provider: string;
  readonly name: string;
  readonly family: ModelFamily;
  readonly description: string;
  readonly capabilities: readonly string[];
  /** What one run costs. Shown before the run, never after it. */
  readonly creditCost: number;
  /** The lowest plan allowed to run it, independent of credit balance. */
  readonly minPlan: PlanId;
  readonly sortOrder: number;
}

export function toCatalogModel(row: z.infer<typeof modelRowSchema>): CatalogModel {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    family: row.family,
    description: row.description,
    capabilities: row.capabilities,
    creditCost: row.credit_cost,
    minPlan: row.min_plan,
    sortOrder: row.sort_order,
  };
}
