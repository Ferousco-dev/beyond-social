"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

import { ChoiceChips } from "@/components/ui/choice-chips";
import { CTA_OPTIONS } from "@/features/generate-form/options";

import { currentEnding, ENDING_SECONDS, endingStart, setEnding } from "../../core/ending.ts";
import { makeId } from "../../lib/format";
import { selectProject, useStudio } from "../../store/editor-store";

/** A closing call-to-action card after the last clip. */
export function EndingSection() {
  const project = useStudio(selectProject);
  const ending = currentEnding(project);
  const [headline, setHeadline] = useState(ending?.headline ?? CTA_OPTIONS[0]?.value ?? "");
  const [detail, setDetail] = useState(ending?.detail ?? "");

  const apply = (next: { headline: string; detail: string } | null): void => {
    const { edit, setNotice, seek } = useStudio.getState();
    const failure = edit((p) => setEnding(p, next, makeId));
    if (failure) return setNotice(failure);
    const start = endingStart(useStudio.getState().history.present);
    if (start !== null) seek(start);
  };

  return (
    <section aria-label="Ending" className="space-y-3 border-t border-hairline pt-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
          <Flag className="size-4" aria-hidden />
          Ending
        </h3>
        <p className="mt-1 text-xs text-ink-soft">A {ENDING_SECONDS}-second closing card after your last clip.</p>
      </div>
      <ChoiceChips label="Call to action" options={CTA_OPTIONS} value={headline} onChange={setHeadline} customPlaceholder="Write your own" />
      <label className="flex flex-col gap-1.5 text-xs text-ink-soft">
        Second line (optional)
        <input
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          maxLength={80}
          placeholder="@yourhandle or yoursite.com"
          className="h-9 rounded-lg border border-hairline bg-paper px-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-primary"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={headline.trim() === ""}
          onClick={() => apply({ headline, detail })}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg bg-ink text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ending ? "Update ending" : "Add ending"}
        </button>
        {ending ? (
          <button type="button" onClick={() => apply(null)} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-hairline px-3 text-sm text-ink hover:bg-cloud">
            Remove
          </button>
        ) : null}
      </div>
      {ending ? <p className="text-xs text-ink-soft">Added clips after this? Press Update ending to move it to the end again.</p> : null}
    </section>
  );
}
