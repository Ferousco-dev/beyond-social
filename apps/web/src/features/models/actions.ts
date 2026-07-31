"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canRunModel } from "@/lib/credits/queries";
import { logger } from "@/lib/logger";
import { getModel } from "@/lib/models/catalog";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ modelId: z.string().min(1).max(64) });

export type SelectResult = { ok: true } | { ok: false; message: string };

/**
 * Stores a model as the user's default for its family.
 *
 * The family is read from the catalogue rather than taken from the client, so a
 * caller cannot file a video model under `audio` and quietly become the default
 * for a family it cannot serve.
 *
 * Tier is checked here as well as at run time. Storing a preference the plan
 * cannot use would produce a default that fails every time it is applied, and
 * the user would have no way to see why. A short balance is not a reason to
 * refuse: credits are bought in a minute, and a default outlives a balance.
 */
export async function setPreferredModel(input: z.input<typeof schema>): Promise<SelectResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Unknown model." };

  const { modelId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to choose a model." };

  const model = await getModel(modelId);
  if (model === null) return { ok: false, message: "That model is not in the catalogue." };

  const check = await canRunModel(modelId);
  if (!check.allowed && check.reason === "plan_tier") {
    return { ok: false, message: "This model is on a higher plan." };
  }

  const { error } = await supabase
    .from("user_model_preferences")
    .upsert(
      { user_id: user.id, family: model.family, model_id: model.id },
      { onConflict: "user_id,family" },
    );

  if (error !== null) {
    logger.warn("could not save the preferred model", { error: error.message, modelId });
    return { ok: false, message: "Could not save that choice." };
  }

  revalidatePath("/dashboard/models");
  return { ok: true };
}
