import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Metric, MetricRow } from "@/components/ui/metric";
import { formatCount } from "@/lib/format";

import { formatDate, formatInstant } from "../format";
import { planLabel } from "../plans";
import { type UserDetail } from "../schema";

/**
 * What this console will say about one account: identity, plan, volume.
 *
 * Every figure is a count or a timestamp. No project title, no prompt, no
 * message, no memory. That is a deliberate limit rather than an omission: none
 * of those is needed to answer a billing question or an abuse report, and a
 * console that displays them makes every admin a reader of private work.
 */
export function AccountSummary({ user }: { user: UserDetail }): ReactNode {
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{user.email}</span>
          {user.fullName ? <span className="text-sm text-ink-soft">{user.fullName}</span> : null}
          <Badge tone={user.suspendedAt ? "danger" : "success"}>
            {user.suspendedAt ? "Suspended" : "Active"}
          </Badge>
          {user.role === "admin" ? <Badge tone="info">Administrator</Badge> : null}
        </div>

        <MetricRow>
          <Metric label="Plan" value={planLabel(user.plan)} hint={subscriptionHint(user)} />
          <Metric
            label="Credits used"
            value={`${formatCount(user.creditsUsed)} / ${formatCount(user.creditsTotal)}`}
            hint={`Period began ${formatDate(user.creditsPeriodStart)}`}
          />
          <Metric label="Projects" value={formatCount(user.projectCount)} />
          <Metric label="Generations" value={formatCount(user.generationCount)} />
          <Metric label="Messages" value={formatCount(user.messageCount)} />
        </MetricRow>

        <MetricRow>
          <Metric label="Signed up" value={formatDate(user.createdAt)} />
          <Metric
            label="Last active"
            value={formatInstant(user.lastActiveAt)}
            hint="Most recent message or generation. Browsing is not recorded."
          />
        </MetricRow>
      </Card>

      {user.suspendedAt ? (
        <Card>
          <p className="text-sm text-ink">
            Suspended {formatInstant(user.suspendedAt)}
            {user.suspendedByEmail ? ` by ${user.suspendedByEmail}` : ""}.
          </p>
          {user.suspendedReason ? (
            <p className="mt-1 text-sm text-ink-soft">Reason given: {user.suspendedReason}</p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Billing state as a caveat under the plan. The plan on the profile is what the
 * app enforces, but Stripe is what the customer is actually paying, and the two
 * differ whenever an operator has comped an account.
 */
function subscriptionHint(user: UserDetail): string {
  if (!user.subscriptionStatus) return "No Stripe subscription on record";

  const parts = [`Stripe: ${user.subscriptionStatus}`];
  if (user.subscriptionPlan && user.subscriptionPlan !== user.plan) {
    parts.push(`billed as ${planLabel(user.subscriptionPlan)}`);
  }
  if (user.subscriptionCancelAtPeriodEnd) parts.push("cancels at period end");
  if (user.subscriptionPeriodEnd) parts.push(`renews ${formatDate(user.subscriptionPeriodEnd)}`);
  return parts.join(", ");
}
