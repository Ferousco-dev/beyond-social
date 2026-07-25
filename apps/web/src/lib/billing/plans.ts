/**
 * The plan catalogue. Credits are the unit customers actually spend, so a plan
 * is defined by its monthly allowance; the Stripe price is just how it is
 * charged. Price ids come from env because they differ between test and live
 * mode, and hard-coding them is how staging ends up billing real cards.
 */

export const PLANS = ["free", "creator", "studio"] as const;
export type PlanId = (typeof PLANS)[number];

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly description: string;
  /** Monthly videos included. */
  readonly credits: number;
  /** USD per month, for display only; Stripe is the source of truth. */
  readonly priceUsd: number;
  readonly features: readonly string[];
}

export const PLAN_CATALOGUE: Readonly<Record<PlanId, Plan>> = {
  free: {
    id: "free",
    name: "Free",
    description: "Enough to see whether the output is good.",
    credits: 15,
    priceUsd: 0,
    features: ["15 videos a month", "Every aspect ratio", "Editor and captions"],
  },
  creator: {
    id: "creator",
    name: "Creator",
    description: "For one person publishing consistently.",
    credits: 100,
    priceUsd: 24,
    features: ["100 videos a month", "Scheduling to every platform", "Priority generation queue"],
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "For a team running several brands.",
    credits: 400,
    priceUsd: 79,
    features: ["400 videos a month", "Brand kits", "Priority support"],
  },
};

/** Maps a Stripe price id back to the plan it sells. */
export function planForPrice(
  priceId: string,
  prices: Readonly<Record<string, string | undefined>>,
): Plan | undefined {
  const entry = Object.entries(prices).find(([, value]) => value === priceId);
  const id = entry?.[0];
  return id !== undefined && (PLANS as readonly string[]).includes(id)
    ? PLAN_CATALOGUE[id as PlanId]
    : undefined;
}
