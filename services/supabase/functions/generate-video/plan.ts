// What to run: the model, and everything that only makes sense once the model
// is known.
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  ShotsNotSupportedError,
  resolveDuration,
  resolveShots,
} from "../_shared/video-capabilities.ts";

/**
 * The model used when the caller does not name one.
 *
 * Seedance rather than Kling: this fallback has no plan context to check
 * against, and Kling is creator-and-up (migration 0070) while Seedance is
 * free-eligible, so it is the one default that can never be refused for a
 * tier reason. Veo, which used to sit here, is deactivated (migration 0130).
 */
export const DEFAULT_MODEL = "bytedance/seedance-1.5-pro";

export interface RunPlan {
  readonly model: string;
  readonly duration: number;
  readonly shots: readonly { prompt: string; duration: number }[];
  /**
   * Veo models are created on `/veo/generate`; every other model on this
   * provider is a market model on `/jobs/createTask`, with a different request
   * shape. The same split the poller makes when asking for status, and by the
   * same test, so a task can always be followed up on the endpoint that made
   * it.
   */
  readonly isVeo: boolean;
}

export type Planned =
  | { readonly ok: true; readonly plan: RunPlan }
  | { readonly ok: false; readonly error: string; readonly status: 400 | 403 | 503 };

const PLAN_RANK = { free: 0, creator: 1, studio: 2 } as const;

/**
 * Settles the model and the shape of the request before anything is charged.
 *
 * The requested id is looked up rather than trusted, and constrained to the
 * video family: naming an avatar model here would otherwise charge that model's
 * rate for a request shaped for a different endpoint. An inactive row is
 * refused, which is what keeps a half-built path from spending a credit.
 */
export async function planRun(
  supabase: SupabaseClient,
  requested: {
    model?: string;
    duration?: number;
    shots?: { prompt?: string; duration?: number }[];
  },
): Promise<Planned> {
  const { data: chosen } = await supabase
    .from("model_catalog")
    .select("id, is_active, min_plan")
    .eq("id", requested.model ?? DEFAULT_MODEL)
    .eq("family", "video")
    .maybeSingle();
  if (!chosen?.is_active) return { ok: false, error: "That model is not available", status: 503 };

  const { data: profile } = await supabase.from("profiles").select("plan").maybeSingle();
  const plan = (profile as { plan?: keyof typeof PLAN_RANK } | null)?.plan ?? "free";
  const minimum = chosen.min_plan as keyof typeof PLAN_RANK;
  if ((PLAN_RANK[plan] ?? PLAN_RANK.free) < (PLAN_RANK[minimum] ?? Number.POSITIVE_INFINITY)) {
    return { ok: false, error: "Your plan does not include that model", status: 403 };
  }

  /*
   * Length is a property of the model, so it can only be settled once the model
   * is known. This was previously fixed at Veo's `[4, 6, 8]` for the whole
   * catalogue, which capped every model at the cheapest one's ceiling: a Kling
   * run that could have been fifteen seconds came back as eight, and a request
   * for twelve fell back to eight rather than being honoured.
   */
  const duration = resolveDuration(chosen.id, requested.duration);

  /*
   * A shot list is refused rather than dropped when the model cannot cut, for
   * the same reason an unknown input field is refused: silently generating one
   * continuous take for someone who asked for five beats bills them in full for
   * something they did not ask for.
   */
  try {
    const shots = resolveShots(
      chosen.id,
      requested.shots?.flatMap((shot) =>
        typeof shot?.prompt === "string" && typeof shot?.duration === "number"
          ? [{ prompt: shot.prompt, duration: shot.duration }]
          : [],
      ),
    );
    return {
      ok: true,
      plan: { model: chosen.id, duration, shots, isVeo: chosen.id.startsWith("veo") },
    };
  } catch (error) {
    if (error instanceof ShotsNotSupportedError) {
      return { ok: false, error: error.message, status: 400 };
    }
    throw error;
  }
}
