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
  /** USD per month when billed annually, for display only. Zero means not priced yet. */
  readonly yearlyPriceUsd: number;
  readonly features: readonly string[];
  /** The tier the pricing page lifts as the guided choice. */
  readonly featured: boolean;
  /** Call to action on the marketing pricing card. */
  readonly cta: string;
  readonly href: "/signup";
}

/*
 * Allowances are credits, and a credit is five cents of provider cost.
 *
 * These read 15, 100 and 400 for a month, which is what they were on 26 July
 * when one credit meant one veo3_fast render. Migration 0051 made a credit five
 * cents on 2 August, multiplied the ledger and the model costs by six, and left
 * these alone, so every plan quietly became a sixth of its intended size and
 * Free delivered two of the fifteen videos it advertises.
 *
 * Restored against the model each tier actually runs, which is what makes the
 * numbers on the pricing page true rather than aspirational:
 *
 *   Free      90cr   15 videos on veo3_fast at 6cr     $4.50 of provider cost
 *   Creator  600cr   20 videos on kling-3.0 at 30cr   $30.00
 *   Studio  1800cr   60 videos on kling-3.0 at 30cr   $90.00
 *
 * Creator advertised a hundred and cannot have one. The paid tiers run the top
 * model deliberately, and a hundred renders of it is a hundred and fifty
 * dollars of provider cost before any margin, so the count comes down rather
 * than the model. See docs/pricing-model.md.
 */
export const PLAN_CATALOGUE: Readonly<Record<PlanId, Plan>> = {
  free: {
    id: "free",
    name: "Free",
    description: "Enough to see whether the output is good.",
    credits: 90,
    priceUsd: 0,
    yearlyPriceUsd: 0,
    features: ["15 videos a month", "Every aspect ratio", "Editor and captions"],
    featured: false,
    cta: "Start free",
    href: "/signup",
  },
  creator: {
    id: "creator",
    name: "Creator",
    description: "For one person publishing consistently.",
    credits: 600,
    priceUsd: 0,
    yearlyPriceUsd: 0,
    features: [
      "Everything in Free",
      "20 videos a month, on the top model",
      "Scheduling to every platform",
      "Trend discovery feed",
      "Priority generation queue",
    ],
    featured: true,
    cta: "Choose Creator",
    href: "/signup",
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "For a team running several brands.",
    credits: 1800,
    priceUsd: 0,
    yearlyPriceUsd: 0,
    features: [
      "Everything in Creator",
      "60 videos a month, on the top model",
      "Brand kits",
      "Batch scheduling",
      "API, webhooks, and MCP for your own tools",
      "Priority support",
    ],
    featured: false,
    cta: "Choose Studio",
    href: "/signup",
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
