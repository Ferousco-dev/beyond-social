"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { errorReference } from "@/lib/errors";

/**
 * Route boundary for the settings section.
 *
 * Settings had none of its own, so a failure reading a connection or a voice
 * profile bubbled to the dashboard boundary and replaced the whole shell,
 * losing the section rail with it. Caught here, the rail stays and the reader
 * can move to another section rather than starting over.
 *
 * The impact line matters more here than elsewhere: these pages are where
 * someone's account, billing and connected platforms live, and a bare failure
 * on that screen reads as "something happened to my account".
 */
export default function SettingsError({
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
    <div className="mt-6 lg:mt-8">
      <ErrorState
        title="This setting did not load"
        impact="Nothing changed. Your account, plan and connected platforms are stored on our side and none of them were touched by this; only this panel failed to render."
        action={{ label: "Try again", onClick: reset }}
        secondary={{ label: "All settings", href: "/dashboard/settings" }}
        reference={errorReference(error)}
      />
    </div>
  );
}
