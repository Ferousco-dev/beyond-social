import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PageShell } from "@/components/landing/page-shell";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { goApi } from "@/lib/go-api/client";
import { creditsResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Welcome" };

/**
 * Post-checkout activation. Stripe returns here; the page reads the live plan
 * and balance rather than trusting the query string, then opens the dashboard.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}): Promise<ReactNode> {
  const { purchase } = await searchParams;
  const [user, credits] = await Promise.all([getCurrentUser(), goApi("/api/v1/credits", creditsResponse)]);
  const balance = credits.ok ? credits.data.data.balance : null;
  const pro = user.plan === "pro";
  const boughtCredits = purchase === "credits";

  return (
    <PageShell
      eyebrow="Payment confirmed"
      title={pro && !boughtCredits ? "Welcome to Pro" : "You're topped up"}
      lede={
        pro && !boughtCredits
          ? "Your subscription is active. Higher limits are on, and you can buy credit packs whenever a session runs full."
          : "Your credits land as soon as the payment confirms, usually within seconds."
      }
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-paper p-5">
        <p className="text-sm text-ink-soft">
          Plan <span className="font-medium text-ink">{pro ? "Pro" : "Free"}</span>
          {balance !== null ? (
            <>
              {" "}· <span className="font-medium tabular-nums text-ink">{balance}</span> credits available
            </>
          ) : null}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open your dashboard
        </Link>
      </div>
    </PageShell>
  );
}
