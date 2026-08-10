"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { IndustryPicker } from "@/components/ui/industry-picker";

import { saveIndustry } from "../industry-actions";

/**
 * The industry, saved on selection.
 *
 * One field and a single choice, so a Save button would be ceremony. The
 * selection is applied immediately and the write happens behind it; the previous
 * value comes back if the server refuses, which is what makes saving on click
 * honest rather than optimistic.
 *
 * The picker is never disabled while that write is in flight. It was, and the
 * result was a grid that greyed out and stopped responding for the length of a
 * round trip, so choosing between two options meant waiting to change your mind.
 * A second click during the first save simply supersedes it.
 */
export function IndustryForm({ industry }: { industry: string | null }) {
  const [value, setValue] = useState(industry);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: string | null) {
    const previous = value;
    setValue(next);
    setMessage(null);

    startTransition(async () => {
      const result = await saveIndustry({ industry: next });
      if (result.ok) return;

      /*
       * Rolled back only if nothing else has been chosen since. Two quick clicks
       * put two writes in flight, and restoring the first one's previous value
       * after the second has landed would undo a choice the user watched happen.
       */
      setValue((current) => (current === next ? previous : current));
      setMessage(result.message);
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-semibold text-ink">Industry</h2>
      <p className="mt-1.5 text-xs text-ink-soft">
        What you make videos about. It decides which trends you are shown and what the composer
        suggests. Press the chosen one again to clear it.
      </p>

      <div className="mt-4">
        <IndustryPicker value={value} onChange={choose} />
      </div>

      {/* Reserved height, so the card does not jump as this appears and goes. */}
      <p role="status" className="mt-3 flex min-h-4 items-center gap-2 text-xs text-ink-soft">
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Saving
          </>
        ) : message ? (
          <span className="text-destructive">{message}</span>
        ) : value !== null ? (
          <>
            <Check className="size-3.5" aria-hidden />
            Saved
          </>
        ) : null}
      </p>
    </section>
  );
}
