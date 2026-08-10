"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { IndustryPicker } from "@/components/ui/industry-picker";

import { saveIndustry } from "../industry-actions";

/**
 * Saves on selection rather than behind a Save button.
 *
 * There is one field and it is a single choice, so a second click to confirm
 * would be ceremony. The previous value is restored if the write fails, which is
 * what makes saving on click honest rather than optimistic.
 */
export function IndustryForm({ industry }: { industry: string | null }) {
  const [value, setValue] = useState(industry);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: string) {
    const previous = value;
    setValue(next);
    setMessage(null);

    startTransition(async () => {
      const result = await saveIndustry({ industry: next });
      if (result.ok) {
        setMessage("Saved.");
        return;
      }
      setValue(previous);
      setMessage(result.message);
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-semibold text-ink">Industry</h2>
      <p className="mt-1.5 text-xs text-ink-soft">
        What you make videos about. It decides which trends you are shown and what the composer
        suggests.
      </p>

      <div className="mt-4">
        <IndustryPicker value={value} onChange={choose} disabled={pending} />
      </div>

      {pending || message ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {pending ? "Saving..." : message}
        </p>
      ) : null}
    </section>
  );
}
