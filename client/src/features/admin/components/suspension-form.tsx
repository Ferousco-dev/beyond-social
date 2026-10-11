"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/use-confirm";
import { setUserSuspension } from "../actions/users";
import { ActionCard } from "./action-card";

export function SuspensionForm({
  userId,
  suspended,
}: {
  readonly userId: string;
  readonly suspended: boolean;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const confirmed = suspended
      ? await confirm({
          title: "Restore this account?",
          description: "Access is reinstated immediately.",
          confirmLabel: "Restore account",
        })
      : await confirm({
          title: "Suspend this account?",
          description:
            "The account keeps its data and can still read and export it, but cannot create projects, send messages, upload assets, request generations or schedule posts until restored. Self-suspension and suspending an admin are refused by the database.",
          confirmLabel: "Suspend account",
          tone: "destructive",
        });
    if (!confirmed) return;

    startTransition(() => {
      void setUserSuspension({ userId, suspended: !suspended, reason }).then((result) => {
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    });
  }

  return (
    <ActionCard
      title="Access"
      description={
        suspended ? "This account is currently suspended." : "Suspend to stop new writes."
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <div>
          <Label htmlFor="suspension-reason">Reason</Label>
          <Input
            id="suspension-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Abuse report, billing dispute…"
            required
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="submit"
          size="sm"
          variant={suspended ? "default" : "destructive"}
          disabled={pending}
          className="w-full"
        >
          {pending ? "Saving…" : suspended ? "Restore account" : "Suspend account"}
        </Button>
      </form>
      {dialog}
    </ActionCard>
  );
}
