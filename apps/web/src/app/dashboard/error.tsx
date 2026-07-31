"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { errorReference } from "@/lib/errors";

/**
 * Route boundary for the dashboard. It catches a render failure in one page
 * without taking the shell down with it, so navigation still works.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <ErrorState
        title="This page did not load"
        impact="Nothing was lost. Your projects, credits and connected accounts are all stored on our side, and none of them were changed by this. Only this screen failed to render."
        action={{ label: "Try again", onClick: reset }}
        secondary={{ label: "Back to dashboard", href: "/dashboard" }}
        reference={errorReference(error)}
      />
    </div>
  );
}
