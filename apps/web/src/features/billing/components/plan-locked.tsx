import { Lock } from "lucide-react";
import { type ReactNode } from "react";

import { StatePanel } from "@/components/ui/empty-state";
import { INTEGRATIONS_PLAN } from "@/lib/billing/entitlements";
import { PLAN_CATALOGUE } from "@/lib/billing/plans";

/**
 * What a surface looks like from below the plan that owns it.
 *
 * It says what the feature does before it says it is locked. A panel that leads
 * with the lock asks someone to pay for a thing they have not been told about
 * yet, and reads as a wall rather than an offer.
 *
 * Deliberately not the real panel with its controls disabled: a disabled form
 * invites you to fill it in and then refuses, and the refusal arrives after the
 * effort rather than before it.
 */
export function PlanLocked({ title, body }: { title: string; body: ReactNode }) {
  const plan = PLAN_CATALOGUE[INTEGRATIONS_PLAN];

  return (
    <StatePanel
      tone="empty"
      icon={Lock}
      title={title}
      body={
        <>
          {body} It is part of the {plan.name} plan.
        </>
      }
      action={{ label: `Upgrade to ${plan.name}`, href: "/dashboard/settings/billing" }}
    />
  );
}
