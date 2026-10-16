"use client";

import { useState } from "react";

import { AnalysisView } from "./analysis-view";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary";

/** Option 2: paste a link, watch it get analysed. */
export function LinkPanel() {
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  if (submitted) {
    return <AnalysisView url={submitted} context="Pasted link" onBack={() => setSubmitted(null)} />;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (url.trim() !== "") setSubmitted(url.trim());
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        TikTok, Instagram, or YouTube link
        <span className="flex gap-2">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            inputMode="url"
            aria-label="Video link"
            className={`${fieldClass} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={url.trim() === ""}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-[10px] bg-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Analyse
          </button>
        </span>
      </label>
      <p className="text-xs text-ink-soft">
        Links the service cannot open get a clear error instead of a silent stall.
      </p>
    </form>
  );
}
