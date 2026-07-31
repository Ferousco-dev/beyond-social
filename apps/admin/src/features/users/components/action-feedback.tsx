"use client";

import { type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { type UserActionState } from "../action-state";

/** The one line each action form shows after it runs. */
export function ActionFeedback({ state }: { state: UserActionState }): ReactNode {
  if (state.status === "idle") return null;

  return (
    <p
      role="status"
      className={cn("text-xs", state.status === "ok" ? "text-success" : "text-destructive")}
    >
      {state.message}
    </p>
  );
}
