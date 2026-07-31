import { type ReactNode } from "react";

import { Section } from "@/components/ui/section";
import {
  createAnalyticsClient,
  fetchActiveUsersDaily,
  fetchAiSpendByModel,
  fetchAiSpendDaily,
  fetchGenerationsDaily,
  fetchSignupsDaily,
  fetchSubscriptionsByPlan,
  fetchUserTotals,
} from "@/lib/analytics";

import { ActivityPanel } from "./components/activity-panel";
import { GenerationsPanel } from "./components/generations-panel";
import { SpendPanel } from "./components/spend-panel";
import { TotalsPanel } from "./components/totals-panel";

export const OVERVIEW_WINDOW_DAYS = 30;

/**
 * Every read is resolved independently and a failure becomes null rather than
 * an exception, so one refused or broken query degrades its own panel instead
 * of replacing the whole page with an error. Null is rendered as "could not be
 * read", never as zero.
 */
async function settle<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch(() => null);
}

export async function OverviewView(): Promise<ReactNode> {
  const client = await createAnalyticsClient();
  const days = OVERVIEW_WINDOW_DAYS;

  const [totals, plans, signups, actives, generations, spend, byModel] = await Promise.all([
    settle(fetchUserTotals(client)),
    settle(fetchSubscriptionsByPlan(client)),
    settle(fetchSignupsDaily(client, days)),
    settle(fetchActiveUsersDaily(client, days)),
    settle(fetchGenerationsDaily(client, days)),
    settle(fetchAiSpendDaily(client, days)),
    settle(fetchAiSpendByModel(client, days)),
  ]);

  return (
    <>
      <Section title="Platform" description="Accounts and paid subscriptions as they stand now.">
        <TotalsPanel totals={totals} plans={plans} />
      </Section>

      <Section title="Activity" description="Who joined and who used the product.">
        <ActivityPanel signups={signups} actives={actives} windowDays={days} />
      </Section>

      <Section title="Generations" description="Video renders started, and how they ended.">
        <GenerationsPanel generations={generations} windowDays={days} />
      </Section>

      <Section title="AI spend" description="Recorded cost of model calls, by day and by model.">
        <SpendPanel spend={spend} byModel={byModel} windowDays={days} />
      </Section>
    </>
  );
}
