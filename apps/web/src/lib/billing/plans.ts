/**
 * The plan catalogue: the single source of truth for what a plan costs and
 * includes.
 *
 * Credits are the unit customers actually spend, so a plan is defined by its
 * monthly allowance; the Stripe price is just how it is charged. Price ids come
 * from env because they differ between test and live mode, and hard-coding them
 * is how staging ends up billing real cards.
 *
 * The marketing pricing cards derive from this too. They used to be a separate
 * hand-written list, and the two drifted: the landing page advertised prices we
 * did not charge. Deriving both from one object is what makes that impossible
 * rather than merely unlikely.
 */

export const PLANS = ["free", "creator", "studio"] as const;
export type PlanId = (typeof PLANS)[number];

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly description: string;
  /** Monthly videos included. */
  readonly credits: number;
  /**
   * USD per month, for display only; Stripe is the source of truth.
   *
   * Zero on a paid plan means "not priced yet" rather than "free". They are
   * different facts and the difference matters: showing the second when the
   * first is true advertises a price we would not honour.
   */
  readonly priceUsd: number;
  readonly features: readonly string[];
  /** The tier the pricing page lifts as the guided choice. */
  readonly featured: boolean;
  /** Call to action on the marketing pricing card. */
  readonly cta: string;
}

export const PLAN_CATALOGUE: Readonly<Record<PlanId, Plan>> = {
  free: {
    id: "free",
    name: "Free",
    description: "Enough to see whether the output is good.",
    credits: 15,
    priceUsd: 0,
    features: ["15 videos a month", "Every aspect ratio", "Editor and captions"],
    featured: false,
    cta: "Start free",
  },
  creator: {
    id: "creator",
    name: "Creator",
    description: "For one person publishing consistently.",
    credits: 100,
    priceUsd: 0,
    features: [
      "Everything in Free",
      "100 videos a month",
      "Scheduling to every platform",
      "Trend discovery feed",
      "Priority generation queue",
    ],
    featured: true,
    cta: "Choose Creator",
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "For a team running several brands.",
    credits: 400,
    priceUsd: 0,
    features: [
      "Everything in Creator",
      "400 videos a month",
      "Brand kits",
      "Batch scheduling",
      "API, webhooks, and MCP for your own tools",
      "Priority support",
    ],
    featured: false,
    cta: "Choose Studio",
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

/** Ordered cheapest first, which is the order the pricing cards read in. */
export const PLAN_LIST: readonly Plan[] = PLANS.map((id) => PLAN_CATALOGUE[id]);

/**
 * Display price, or null when the plan has no price to show.
 *
 * Null rather than "$0" or "Free": a paid plan whose price is not set yet is
 * not a free plan, and every surface that renders it has to say something other
 * than the wrong thing. Returning null forces that decision at the call site
 * instead of hiding it here.
 */
export function priceLabel(plan: Plan): string | null {
  if (plan.id === "free") return "Free";
  return plan.priceUsd > 0 ? `$${plan.priceUsd}` : null;
}

/** True when the plan can actually be sold: it has a price to charge. */
export function isPriced(plan: Plan): boolean {
  return plan.id === "free" || plan.priceUsd > 0;
}
