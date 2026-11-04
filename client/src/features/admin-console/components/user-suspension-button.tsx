"use client";

import { Ban, RotateCcw } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";

import { setUserSuspension } from "../actions";
import { useAdminAction } from "../use-admin-action";

export function UserSuspensionButton({
  userId,
  suspended,
}: {
  readonly userId: string;
  readonly suspended: boolean;
}): ReactNode {
  const { pending, error, run } = useAdminAction();
  const { confirm, dialog } = useConfirm();

  const toggle = async (): Promise<void> => {
    if (!suspended) {
      const ok = await confirm({
        title: "Suspend this account?",
        description: "The user loses access until the account is restored.",
        confirmLabel: "Suspend",
        tone: "destructive",
      });
      if (!ok) return;
    }
    run(() => setUserSuspension(userId, !suspended));
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {dialog}
      <Button
        type="button"
        size="sm"
        variant={suspended ? "outline" : "destructive"}
        disabled={pending}
        onClick={() => void toggle()}
        aria-label={suspended ? "Restore account" : "Suspend account"}
      >
        {suspended ? <RotateCcw aria-hidden /> : <Ban aria-hidden />}
        {pending ? (suspended ? "Restoring..." : "Suspending...") : suspended ? "Restore" : "Suspend"}
      </Button>
      {error ? <p role="alert" className="max-w-48 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}