import { type Metadata } from "next";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { formatPrice } from "@/features/billing/format";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { creditsResponse, plansResponse } from "@/lib/go-api/schemas";
import { GenerateFormShell } from "@/features/generate-form/generate-form-shell";

export const metadata: Metadata = { title: "Configure video" };

/**
 * Main generation page: the 5-step form. Selections that need a backend read
 * it here; the brief and approved script arrive from the New Video flow
 * through the browser.
 */
export default async function VideosNewPage(): Promise<ReactNode> {
  const [credits, user, plans] = await Promise.all([
    goApi("/api/v1/credits", creditsResponse),
    getCurrentUser(),
    goApi("/api/v1/plans", plansResponse, { anonymous: true }),
  ]);
  // Only a Free member is shown the Pro offer, and only when the price is known.
  const proPrice = user.plan === "free" && plans.ok ? formatPrice(plans.data.data.pro_price_cents, "usd") : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Link href={"/dashboard/new" as Route} className="text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline">
        Back to New Video
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Configure video</h1>
      <p className="mt-1 text-sm text-ink-soft">
        About two minutes: three short steps, then a review that shows the credit cost before anything is charged. Your answers save as you go.
      </p>
      <div className="mt-6">
        <GenerateFormShell balance={credits.ok ? credits.data.data.balance : null} proPrice={proPrice} />
      </div>
    </div>
  );
}
