import Stripe from "stripe";

import { PLAN_CATALOGUE, type PlanId } from "@/lib/billing/plans";

/**
 * Does Stripe charge what the pricing page promises?
 *
 * `priceUsd` in the plan catalogue is display only. The money actually taken is
 * whatever the Stripe price behind STRIPE_PRICE_CREATOR or STRIPE_PRICE_STUDIO
 * says, so the two are separate facts that have to be kept equal by hand, and
 * nothing in the type system notices when they stop being.
 *
 * A page that advertises seventy nine and bills two hundred is the worst
 * failure this product can have, so it is checked here rather than trusted.
 *
 * Skips rather than fails when Stripe is not connected: an unconfigured
 * checkout is a known state, not a broken one.
 */

const results: string[] = [];
let failures = 0;

function check(name: string, passed: boolean, detail = ""): void {
  results.push(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

const secret = process.env.STRIPE_SECRET_KEY ?? "";
const priceIds: Readonly<Record<Exclude<PlanId, "free">, string>> = {
  creator: process.env.STRIPE_PRICE_CREATOR ?? "",
  studio: process.env.STRIPE_PRICE_STUDIO ?? "",
};

if (secret === "") {
  process.stdout.write("Stripe is not configured, so there is nothing to compare. Skipped.\n");
  process.exit(0);
}

const stripe = new Stripe(secret);

for (const plan of ["creator", "studio"] as const) {
  const id = priceIds[plan];
  const expected = PLAN_CATALOGUE[plan].priceUsd;

  if (id === "") {
    check(`${plan} has a price id`, false, "env is empty while the plan is priced");
    continue;
  }

  try {
    const price = await stripe.prices.retrieve(id);
    // Stripe holds money in the smallest unit, so dollars are cents here.
    const actual = (price.unit_amount ?? 0) / 100;
    check(
      `${plan} charges what the page advertises`,
      actual === expected,
      `page $${expected}, stripe $${actual}`,
    );
    check(`${plan} price is live`, price.active === true, String(price.active));
    check(
      `${plan} is a recurring subscription`,
      price.type === "recurring",
      price.type ?? "unknown",
    );
    check(`${plan} bills in usd`, price.currency === "usd", price.currency ?? "unknown");
  } catch (error) {
    check(
      `${plan} price id resolves in Stripe`,
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

process.stdout.write(
  `${results.join("\n")}\n\n${results.length - failures}/${results.length} passed\n`,
);
if (failures > 0) process.exit(1);
