import { type Metadata } from "next";
import { type Route } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { formatPrice } from "@/features/billing/format";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { creditsResponse, plansResponse } from "@/lib/go-api/schemas";
import { ConfigureArt } from "@/features/generate-form/configure-art";
import { GenerateFormShell } from "@/features/generate-form/generate-form-shell";

export const metadata: Metadata = { title: "Configure video" };

/**
 * Main generation page: Configure video on one screen. Selections that need a backend read
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
      <Link
        href={"/dashboard/new" as Route}
        prefetch
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline bg-paper pl-2.5 pr-3.5 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        New Video
      </Link>
      <header className="mt-5 flex items-center gap-3">
        <ConfigureArt className="size-12 shrink-0 rounded-xl bg-cloud/70 p-1" />
        <h1 className="text-xl font-semibold tracking-tight text-ink">Configure video</h1>
      </header>
      <div className="mt-6">
        <GenerateFormShell balance={credits.ok ? credits.data.data.balance : null} proPrice={proPrice} />
      </div>
    </div>
  );
}
