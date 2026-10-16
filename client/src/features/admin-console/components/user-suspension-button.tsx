"use client";

import { Ban, RotateCcw } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";

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

  const toggle = (): void => {
    if (!suspended && !window.confirm("Suspend this account? The user will lose access until restored.")) return;
    run(() => setUserSuspension(userId, !suspended));
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={suspended ? "outline" : "destructive"}
        disabled={pending}
        onClick={toggle}
        aria-label={suspended ? "Restore account" : "Suspend account"}
      >
        {suspended ? <RotateCcw aria-hidden /> : <Ban aria-hidden />}
        {pending ? (suspended ? "Restoring..." : "Suspending...") : suspended ? "Restore" : "Suspend"}
      </Button>
      {error ? <p role="alert" className="max-w-48 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}