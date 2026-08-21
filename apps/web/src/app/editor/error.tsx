"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { errorReference } from "@/lib/errors";

/**
 * Route boundary for the editor.
 *
 * The heaviest route in the product: it reads a thread, a saved timeline and
 * every finished render, and signs a URL for each clip. Any of those can fail,
 * and until now all of them produced a bare error page.
 *
 * The reassurance is specific because the fear is specific. Someone whose editor
 * has just failed assumes their cut is gone, and it is not: the timeline is
 * autosaved server-side and reloading reads it back.
 */
export default function EditorError({
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
    // Dark-scoped like the editor itself, so a failure does not flash a white
    // page in the middle of a dark workspace.
    <div className="dark flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-2xl">
        <ErrorState
          title="The editor did not load"
          impact="Your cut is safe. The timeline is saved as you work, so nothing you edited was lost; this screen failed to open it."
          action={{ label: "Try again", onClick: reset }}
          secondary={{ label: "Back to your projects", href: "/dashboard" }}
          reference={errorReference(error)}
        />
      </div>
    </div>
  );
}
