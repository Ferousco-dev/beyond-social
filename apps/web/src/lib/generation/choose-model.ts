import "server-only";

import { logger } from "@/lib/logger";
import { type createClient } from "@/lib/supabase/server";

import { selectModel, type CatalogModel, type ModelChoice } from "./select-model";

/**
 * Reads what the selector needs, then asks it.
 *
 * Split from `select-model` so the deciding is a pure function with no database
 * in it: the rules are the part worth testing, and they are testable without a
 * connection. This is the boring half that fetches the plan and the catalogue.
 *
 * Returns null rather than throwing. A failure to read the catalogue should
 * leave the caller on the edge function's default, which still makes a video,
 * rather than taking the turn down over a model preference.
 */
export async function chooseModel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  prompt: string,
  videoPaths: readonly string[] | undefined,
): Promise<ModelChoice | null> {
  try {
    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
      supabase
        .from("model_catalog")
        .select("id, credit_cost, min_plan, capabilities, is_active")
        .eq("family", "video")
        .eq("is_active", true),
    ]);

    const catalog: CatalogModel[] = (
      (rows ?? []) as {
        id: string;
        credit_cost: number;
        min_plan: string;
        capabilities: string[] | null;
        is_active: boolean;
      }[]
    ).map((row) => ({
      id: row.id,
      creditCost: row.credit_cost,
      // The column is free text at the database level; anything unrecognised is
      // treated as the most restrictive tier rather than the least, so a typo
      // cannot hand an expensive model to a free account.
      minPlan:
        row.min_plan === "free" || row.min_plan === "creator" || row.min_plan === "studio"
          ? row.min_plan
          : "studio",
      capabilities: row.capabilities ?? [],
      isActive: row.is_active,
    }));

    const plan = (profile as { plan?: string } | null)?.plan;

    return selectModel({
      prompt,
      // Same reasoning as the tier above: an unknown plan is treated as the
      // cheapest, so a missing profile row cannot buy a Kling render.
      plan: plan === "creator" || plan === "studio" ? plan : "free",
      /*
       * Avatar work does not come through here.
       *
       * A photo plus a voice clip is sent by `startAvatarGeneration`, which is
       * its own path with its own consent gate, so this branch never sees one
       * and says so rather than pretending to check.
       */
      hasFaceAndVoice: false,
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
