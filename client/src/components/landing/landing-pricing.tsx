import { Coins, Gift, Sparkles } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FREE_SIGNUP_CREDITS } from "@/lib/marketing/credits";

import { SectionHeading } from "./section-heading";

const POINTS = [
  {
    icon: Gift,
    title: `${FREE_SIGNUP_CREDITS} free credits`,
    description: "Every new account starts with credits to try searching, transforming and creating a video.",
  },
  {
    icon: Sparkles,
    title: "Pay only for what you make",
    description: "Each action has a clear credit cost, and credits come back if something fails.",
  },
  {
    icon: Coins,
    title: "Top up when you need more",
    description: "No monthly plan. When your credits run out, buy more and carry on.",
  },
] as const;

/** Pricing: one currency, credits, with no plans to compare. */
export function LandingPricing(): ReactNode {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free, then pay for credits"
          description="No plans and no subscriptions. Everything runs on credits."
        />

        <ul className="mt-14 grid gap-6 lg:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="rounded-2xl border border-hairline bg-paper p-7 text-center">
              <Icon className="mx-auto size-6 text-primary" aria-hidden />
              <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <Link href="/signup" className={buttonVariants({ variant: "default" })}>
            Get {FREE_SIGNUP_CREDITS} free credits
          </Link>
        </div>
      </div>
    </section>
  );
}
