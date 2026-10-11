"use server";

import { z } from "zod";

import { analyseIdea, buildBrief } from "@/lib/brief/generate";
import { reviewBrief } from "@/lib/brief/review";
import {
  analysisSchema,
  answersSchema,
  type ContentBrief,
  type IdeaAnalysis,
} from "@/lib/brief/schema";
import { logger } from "@/lib/logger";
import { getIndustry } from "@/lib/profile/industry";
import { isPromptEngineConfigured } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";

/**
 * The two steps of the idea refiner.
 *
 * Both are signed-in only: they spend model budget, so an anonymous visitor does
 * not get to drive them. Both report "unconfigured" separately from "failed",
 * because a deployment with no model key should say so rather than look broken.
 */

export type AnalysisResult =
  | { status: "ok"; analysis: IdeaAnalysis }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

export type BriefResult =
  | { status: "ok"; brief: ContentBrief }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

const ideaSchema = z.object({
  idea: z.string().trim().min(10, "Tell us a little more about the idea").max(2000),
});

const briefInputSchema = ideaSchema.extend({
  analysis: analysisSchema,
  answers: answersSchema,
});

/** Every entry point needs the same check, so it is one function. */
async function requireUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user !== null;
}

export async function analyseIdeaAction(
  input: z.input<typeof ideaSchema>,
): Promise<AnalysisResult> {
  const parsed = ideaSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check that idea" };
  }
  if (!(await requireUser())) return { status: "error", message: "Sign in to refine an idea." };
  if (!isPromptEngineConfigured) return { status: "unconfigured" };

  try {
    const analysis = await analyseIdea(parsed.data.idea, await getIndustry());
    if (analysis === null) {
      return {
        status: "error",
        message: "That came back in a shape we could not read. Try again.",
      };
    }
    return { status: "ok", analysis };
  } catch (error) {
    logger.error("idea analysis failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not read that idea just now." };
  }
}

export async function buildBriefAction(
  input: z.input<typeof briefInputSchema>,
): Promise<BriefResult> {
  const parsed = briefInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Answer the questions first." };
  if (!(await requireUser())) return { status: "error", message: "Sign in to build a brief." };
  if (!isPromptEngineConfigured) return { status: "unconfigured" };

  try {
    const brief = await buildBrief(
      parsed.data.idea,
      parsed.data.analysis,
      parsed.data.answers,
      await getIndustry(),
    );
    if (brief === null) {
      return {
        status: "error",
        message: "That came back in a shape we could not read. Try again.",
      };
    }

    /*
     * Reviewed by a model that did not write it, which is the only pass that can
     * catch a brief being fluent and wrong: an answer quietly ignored, beats that
     * do not add up, a hook that describes the opening instead of being it.
     *
     * Awaited rather than fired off, because the user is about to act on this
     * and a correction that lands after they read it is no correction. It can
     * only improve or do nothing: a failed review returns the original.
     */
    return {
      status: "ok",
      brief: await reviewBrief(parsed.data.idea, parsed.data.analysis, parsed.data.answers, brief),
    };
  } catch (error) {
    logger.error("brief generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "error", message: "Could not write that brief just now." };
  }
}
