"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { errorReference } from "@/lib/errors";

/**
 * Route boundary for the editor.
 *
 * This is the one screen in the product where a crash can cost work, so the
 * copy is specific about it instead of reassuring. The claim it makes matches
 * `useAutosave`: edits are written about a second after they settle and are held
 * in memory until then, with no local draft to fall back on. So the honest
 * statement is that saved work is intact and the last moment of editing may not
 * be, which is exactly what the user needs to know before deciding whether to
 * redo anything.
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
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <ErrorState
        title="The editor stopped before it finished"
        impact={
          <>
            <span className="block">
              Your timeline saves on its own about a second after each change, so everything up to
              your last edit is on our side and nothing already saved was overwritten.
            </span>
            <span className="mt-3 block font-medium text-ink">
              Any change you made in the moment before this happened may not have been saved. Check
              your most recent edit when the editor reopens.
            </span>
          </>
        }
        action={{ label: "Reopen the editor", onClick: reset }}
        secondary={{ label: "Back to dashboard", href: "/dashboard" }}
        reference={errorReference(error)}
      />
    </div>
  );
}
