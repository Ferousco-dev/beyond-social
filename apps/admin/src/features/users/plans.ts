/**
 * The plan catalogue as the console needs it: an id, a name, and the monthly
 * credit allowance that comes with it.
 *
 * This mirrors `apps/web/src/lib/billing/plans.ts`, which is the source of
 * truth. The two apps do not share a package yet, so a plan added there must be
 * added here as well; nothing else in the console decides what a plan includes.
 */

export const PLAN_IDS = ["free", "creator", "studio"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface ConsolePlan {
  readonly id: PlanId;
  readonly name: string;
  /** Monthly videos included, written to `profiles.credits_total`. */
  readonly credits: number;
}

export const PLAN_CATALOGUE: Readonly<Record<PlanId, ConsolePlan>> = {
  free: { id: "free", name: "Free", credits: 15 },
  creator: { id: "creator", name: "Creator", credits: 100 },
  studio: { id: "studio", name: "Studio", credits: 400 },
};

export const PLAN_LIST: readonly ConsolePlan[] = PLAN_IDS.map((id) => PLAN_CATALOGUE[id]);

/**
 * A stored plan as a label. Billing can leave a plan id here that the catalogue
 * no longer lists, so the raw value is shown rather than hidden behind a dash.
 */
export function planLabel(plan: string): string {
  return (PLAN_IDS as readonly string[]).includes(plan)
    ? PLAN_CATALOGUE[plan as PlanId].name
    : plan;
}
