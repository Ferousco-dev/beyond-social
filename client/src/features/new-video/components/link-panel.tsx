"use client";

import { useState } from "react";

import { AnalysisView } from "./analysis-view";
import { LinkPreview } from "./link-preview";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary";

interface Approved {
  url: string;
  mediaId?: string;
  notes: string;
}

/** Option 2: paste a link, watch the video, then explicitly ask for an analysis. */
export function LinkPanel({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [approved, setApproved] = useState<Approved | null>(null);

  if (approved) {
    return (
      <AnalysisView
        url={approved.url}
        mediaId={approved.mediaId}
        notes={approved.notes}
        context="Pasted link"
        onBack={() => setApproved(null)}
      />
    );
  }

  if (submitted) {
    return <LinkPreview url={submitted} onApprove={setApproved} onBack={() => setSubmitted(null)} />;
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
            Preview video
          </button>
        </span>
      </label>
      <p className="text-xs text-ink-soft">
        You will see the video first. Analysis creates a summary and fresh script; it does not generate or transform a video.
      </p>
    </form>
  );
}
