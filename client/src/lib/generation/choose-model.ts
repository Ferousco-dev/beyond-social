import "server-only";

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
  prompt: string,
  videoPaths: readonly string[] | undefined,
  hasFaceAndVoice: boolean,
  hasVoice: boolean,
  referenceImages: number,
): Promise<ModelChoice | null> {
  try {
    const { data: models, error: modelsError } = await supabase
      .from("model_catalog")
      .select("id, credit_cost, capabilities, is_active")
      .eq("family", "video")
      .eq("is_active", true);

    // Neither error is fatal, the catch below already covers a thrown one and
    // the empty-catalogue check after this covers an empty result, but a
    // failed read used to look identical to an empty answer with nothing in
    // the log to say the whole account base silently reverted to the edge
    // function's default model for every request while it lasted.
    if (modelsError)
      logger.warn("could not read the model catalog", { error: modelsError.message });

    const rows = (models ?? []) as {
      id: string;
      credit_cost: number;
      capabilities: string[] | null;
      is_active: boolean;
    }[];
    if (rows.length === 0) return null;

    const catalog: CatalogModel[] = rows.map((row) => ({
      id: row.id,
      creditCost: row.credit_cost,
      capabilities: row.capabilities ?? [],
      isActive: row.is_active,
    }));

    return selectModel({
      prompt,
      hasFaceAndVoice,
      hasVoice,
      referenceImages,
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
