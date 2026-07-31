/**
 * Credit packs: the one place a top-up is defined.
 *
 * Sizes are anchored to what a credit actually buys. The catalogue prices a
 * video run at 1 credit (`veo3_fast`), and the plan allowances are 15, 100 and
 * 400 videos a month, so a pack has to be worth a real stretch of work: the
 * smallest is three weeks of free-plan output, the largest is nearly four
 * months of Studio. Anything smaller would be a rounding error on a plan.
 *
 * Prices are deliberately `null`. No pack price exists anywhere in this repo,
 * Stripe is not connected, and `PLAN_CATALOGUE` carries `priceUsd: 0` for every
 * plan, so any dollar figure here would be invented. Set `priceUsd` once real
 * prices exist and the saving badges start computing themselves.
 */

export interface CreditPack {
  readonly id: string;
  readonly name: string;
  /** Credits added to the balance. They never expire. */
  readonly credits: number;
  /** USD, or null while pricing is undecided. Never a placeholder number. */
  readonly priceUsd: number | null;
  readonly description: string;
  /** The pack the grid lifts as the guided choice. */
  readonly featured: boolean;
}

/**
 * The pack every other pack is measured against: the smallest, and so the
 * dearest per credit. Named separately so the saving maths cannot be reading an
 * element that the type system only believes might exist.
 */
const BASE_PACK: CreditPack = {
  id: "starter",
  name: "Starter",
  credits: 50,
  priceUsd: null,
  description: "About three weeks of output on top of the free allowance.",
  featured: false,
};

export const CREDIT_PACKS: readonly CreditPack[] = [
  BASE_PACK,
  {
    id: "plus",
    name: "Plus",
    credits: 150,
    priceUsd: null,
    description: "A busy month, or a campaign run in one sitting.",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 500,
    priceUsd: null,
    description: "A quarter of steady publishing for one brand.",
    featured: false,
  },
  {
    id: "scale",
    name: "Scale",
    credits: 1500,
    priceUsd: null,
    description: "Several brands, several months, bought once.",
    featured: false,
  },
];

/**
 * How much cheaper a credit is in this pack than in the smallest one, rounded
 * down so the badge never overstates the discount.
 *
 * Returns null when either price is unset, which is what stops the UI inventing
 * a saving it cannot compute.
 */
export function savingPercent(pack: CreditPack): number | null {
  if (pack.priceUsd === null || BASE_PACK.priceUsd === null) return null;
  if (pack.id === BASE_PACK.id) return null;

  const baseRate = BASE_PACK.priceUsd / BASE_PACK.credits;
  const rate = pack.priceUsd / pack.credits;
  const saving = Math.floor((1 - rate / baseRate) * 100);
  return saving > 0 ? saving : null;
}
