/**
 * Credit packs: the one place a top-up is defined.
 *
 * Credits here are on the same scale as everywhere else in the ledger: one
 * credit is five cents of provider cost, fixed by migration
 * `0051_credit_rebase`. These four sizes were set before that rebase, when a
 * credit still meant one `veo3_fast` render, and were missed when 0051
 * multiplied the ledger and every model price by six, the same bug
 * `0098_rebase_plan_allowances` fixed for the signup grant and
 * `lib/billing/plans.ts` fixed for the plan allowances. Rebased here on the
 * same factor, so each pack still buys the same number of videos it always
 * did.
 *
 * Priced on the same footing as the plans: a credit costs five cents to
 * serve, and each pack is set so the worst case, every credit spent, still
 * clears roughly sixty per cent gross.
 *
 *   Starter   300cr = $ 15.00 of provider cost, sold at $ 39
 *   Plus      900cr = $ 45.00                   sold at $109
 *   Pro      3000cr = $150.00                   sold at $349
 *   Scale    9000cr = $450.00                   sold at $999
 *
 * The per credit rate falls as the pack grows, which is what the saving badge
 * reads: six, ten and fourteen per cent against the starter. The badge computes
 * itself from these numbers, so it cannot drift from them.
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
  credits: 300,
  priceUsd: 39,
  description: "About fifty videos on top of the free allowance.",
  featured: false,
};

export const CREDIT_PACKS: readonly CreditPack[] = [
  BASE_PACK,
  {
    id: "plus",
    name: "Plus",
    credits: 900,
    priceUsd: 109,
    description: "A busy month, or a campaign run in one sitting.",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 3000,
    priceUsd: 349,
    description: "A quarter of steady publishing for one brand.",
    featured: false,
  },
  {
    id: "scale",
    name: "Scale",
    credits: 9000,
    priceUsd: 999,
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
