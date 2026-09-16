"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/use-confirm";
import { setUserPlan } from "../actions/users";
import { ActionCard } from "./action-card";

export function PlanForm({
  userId,
  plan,
  creditsTotal,
}: {
  readonly userId: string;
  readonly plan: string | null;
  readonly creditsTotal: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [nextPlan, setNextPlan] = useState(plan ?? "");
  const [total, setTotal] = useState(String(creditsTotal));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const confirmed = await confirm({
      title: "Change plan?",
      description: `Overrides the account's plan to "${nextPlan}" with ${total} credits. The next Stripe webhook for this customer may reassert the billed plan.`,
      confirmLabel: "Change plan",
    });
    if (!confirmed) return;

    startTransition(() => {
      void setUserPlan({ userId, plan: nextPlan, total: Number(total), reason }).then((result) => {
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    });
  }

  return (
    <ActionCard
      title="Plan"
      description="Comp or repair an account's plan. This does not touch Stripe."
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="plan-id">Plan</Label>
            <Input
              id="plan-id"
              value={nextPlan}
              onChange={(event) => setNextPlan(event.target.value)}
              placeholder="pro"
              required
            />
          </div>
          <div>
            <Label htmlFor="plan-credits">Credits</Label>
            <Input
              id="plan-credits"
              type="number"
              min={0}
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="plan-reason">Reason</Label>
          <Input
            id="plan-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Comp, downgrade, billing repair…"
            required
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? "Saving…" : "Change plan"}
        </Button>
      </form>
      {dialog}
    </ActionCard>
  );
}
