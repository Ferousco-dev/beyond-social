/**
 * What a plan is allowed to do, as opposed to how much of it.
 *
 * Credits answer "how many videos"; this answers "which surfaces exist at all".
 * They are separate questions and they fail differently: running out of credits
 * is a top-up, being on the wrong plan is an upgrade, and telling someone to
 * buy credits when the plan is the problem sends them to the wrong page.
 *
 * The rank mirrors `plan_rank` in the database (0037) on purpose. That function
 * is the authority for what a plan may run; this is the same ordering in the
 * language the interface speaks, so a check written here and a check written in
 * SQL cannot disagree about which plan is higher.
 */

import { PLANS, type PlanId } from "./plans";

/** Cheapest first, which is what makes comparison meaningful. */
const RANK: Readonly<Record<PlanId, number>> = { free: 1, creator: 2, studio: 3 };

/** Anything unrecognised is treated as the lowest plan, so this fails closed. */
export function planRank(plan: string): number {
  return (PLANS as readonly string[]).includes(plan) ? RANK[plan as PlanId] : RANK.free;
}

export function isAtLeast(plan: string, required: PlanId): boolean {
  return planRank(plan) >= RANK[required];
}

/**
 * The plan that owns the integration surfaces: API keys, webhooks, and the MCP
 * endpoint agents connect to. One constant, because these three are sold as one
 * thing and drifting them apart would make the upgrade copy a lie somewhere.
 */
export const INTEGRATIONS_PLAN: PlanId = "studio";

export function hasIntegrations(plan: string): boolean {
  return isAtLeast(plan, INTEGRATIONS_PLAN);
}
