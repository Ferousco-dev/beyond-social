"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/use-confirm";
import { setUserCredits } from "../actions/users";
import { ActionCard } from "./action-card";

export function CreditsForm({
  userId,
  creditsTotal,
  creditsUsed,
}: {
  readonly userId: string;
  readonly creditsTotal: number;
  readonly creditsUsed: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [total, setTotal] = useState(String(creditsTotal));
  const [used, setUsed] = useState(String(creditsUsed));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const confirmed = await confirm({
      title: "Adjust credits?",
      description: `Sets this account's allowance to ${total} and usage to ${used}. Recorded in the credit ledger and the audit log.`,
      confirmLabel: "Adjust credits",
    });
    if (!confirmed) return;

    startTransition(() => {
      void setUserCredits({
        userId,
        total: Number(total),
        used: Number(used),
        reason,
      }).then((result) => {
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    });
  }

  return (
    <ActionCard title="Credits" description="Override the allowance and consumption directly.">
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="credits-total">Total</Label>
            <Input
              id="credits-total"
              type="number"
              min={0}
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="credits-used">Used</Label>
            <Input
              id="credits-used"
              type="number"
              min={0}
              value={used}
              onChange={(event) => setUsed(event.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="credits-reason">Reason</Label>
          <Input
            id="credits-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Support ticket #, refund, comp…"
            required
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? "Saving…" : "Adjust credits"}
        </Button>
      </form>
      {dialog}
    </ActionCard>
  );
}
