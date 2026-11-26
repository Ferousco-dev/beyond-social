"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useRef, useState } from "react";
import { useOnMount } from "@/lib/hooks/use-page-effects";

import { clearDraft } from "@/features/generate-form/draft";
import { REFERENCE_KEY } from "@/features/generate-form/reference-script";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20";

/**
 * Paste a link, press one button. The form opens at once and writes the script
 * from the video in the background, so there is no preview, no waiting screen and
 * no approval step in between.
 */
export function LinkPanel({
  initialUrl = "",
  resumeJobId,
  resumeStage,
}: {
  initialUrl?: string;
  /** A draft reopened from the sidebar: an analysis already running to pick back up. */
  resumeJobId?: string;
  resumeStage?: "preview" | "analysis";
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const resumed = useRef(false);

  function open(request: { url: string; key: string } | { jobId: string }): void {
    try {
      clearDraft();
      for (const key of ["bs:generate-draft", "bs:approved-script", "bs:own-idea", "bs:quick-start"]) window.sessionStorage.removeItem(key);
      window.sessionStorage.setItem(REFERENCE_KEY, JSON.stringify(request));
    } catch {
      setError("This browser could not save your choice. Check its storage settings and try again.");
      return;
    }
    router.push("/dashboard/videos/new" as Route);
  }

  useOnMount(() => {
    if (resumed.current || resumeStage !== "analysis" || !resumeJobId) return;
    resumed.current = true;
    open({ jobId: resumeJobId });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (url.trim() !== "") open({ url: url.trim(), key: crypto.randomUUID() });
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        TikTok, Instagram, or YouTube link
        <span className="flex flex-col gap-2 sm:flex-row">
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
            className="btn btn-primary btn-md shrink-0"
          >
            Use this video
          </button>
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-ink-soft">We write you a fresh script from it. The video itself is never copied or changed.</p>
      )}
    </form>
  );
}
