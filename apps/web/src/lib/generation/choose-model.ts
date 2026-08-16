import "server-only";

import { type PlanId } from "@/lib/billing/plans";
import { logger } from "@/lib/logger";
import { type createClient } from "@/lib/supabase/server";

import { selectModel, type CatalogModel, type ModelChoice } from "./select-model";

/**
 * The chooser, given a real account and the real catalogue.
 *
 * `selectModel` is the decision and is pure so it can be tested without a
 * database. This is the part that fetches what it decides from: the plan the
 * account is on, and the models actually live at the prices actually billed.
 *
 * Never throws. A generation that cannot establish a model falls through to the
 * edge function's own default, which is what happened for every video until
 * now, so the worst case here is the behaviour this replaced.
 */
export async function chooseModel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  prompt: string,
  videoPaths: readonly string[] | undefined,
  hasFaceAndVoice: boolean,
): Promise<ModelChoice | null> {
  try {
    const [{ data: profile }, { data: models }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
      supabase
        .from("model_catalog")
        .select("id, credit_cost, min_plan, capabilities, is_active")
        .eq("family", "video")
        .eq("is_active", true),
    ]);

    const rows = (models ?? []) as {
      id: string;
      credit_cost: number;
      min_plan: string;
      capabilities: string[] | null;
      is_active: boolean;
    }[];
    if (rows.length === 0) return null;

    const catalog: CatalogModel[] = rows.map((row) => ({
      id: row.id,
      creditCost: row.credit_cost,
      // An unknown tier is treated as the most restrictive rather than the
      // least: guessing "free" for a value we do not recognise would hand out
      // the expensive models.
      minPlan: (["free", "creator", "studio"].includes(row.min_plan)
        ? row.min_plan
        : "studio") as PlanId,
      capabilities: row.capabilities ?? [],
      isActive: row.is_active,
    }));

    const plan = (profile as { plan?: string } | null)?.plan;

    return selectModel({
      prompt,
      plan: (["free", "creator", "studio"].includes(plan ?? "") ? plan : "free") as PlanId,
      hasFaceAndVoice,
      hasFootage: (videoPaths?.length ?? 0) > 0,
      catalog,
    });
  } catch (error) {
    logger.warn("could not choose a model", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
