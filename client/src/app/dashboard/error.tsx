"use client";

import { ErrorState } from "@/components/ui/error-state";
import { errorReference } from "@/lib/errors";
import { useReportError } from "@/lib/hooks/use-page-effects";

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
  useReportError(error);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <ErrorState
        title="This page did not load"
        impact="Your projects, credits and connected accounts were not changed. Only this screen failed to load."
        action={{ label: "Try again", onClick: reset }}
        secondary={{ label: "Back to dashboard", href: "/dashboard" }}
        reference={errorReference(error)}
      />
    </div>
  );
}
