"use client";

import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useState } from "react";

import { clearDraft } from "@/features/generate-form/draft";
import { Spinner } from "@/components/ui/spinner";

const fieldClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink/30 focus:ring-4 focus:ring-ink/5";

export interface OwnIdea {
  title?: string;
  objective: string;
}

export const OWN_IDEA_KEY = "bs:own-idea";
const QUICK_KEY = "bs:quick-start";

/** Option 3: project title and what the video is for. Length, look and the rest are chosen on the next page. */
export function OwnIdeaPanel() {
  const router = useRouter();
  const [fields, setFields] = useState<OwnIdea>({ title: "", objective: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set(key: keyof OwnIdea, value: string): void {
    setSubmitError(null);
    setFields((current) => ({ ...current, [key]: value }));
  }

  const ready = fields.objective.trim() !== "";

  function go(quick: boolean): void {
    if (!ready || submitting) return;
    setSubmitting(true);
    try {
      clearDraft();
      window.sessionStorage.removeItem("bs:generate-draft");
      window.sessionStorage.removeItem("bs:approved-script");
      window.sessionStorage.setItem(OWN_IDEA_KEY, JSON.stringify(fields));
      if (quick) window.sessionStorage.setItem(QUICK_KEY, "true");
      else window.sessionStorage.removeItem(QUICK_KEY);
      router.push("/dashboard/videos/new" as Route);
    } catch {
      setSubmitting(false);
      setSubmitError("This browser could not save your idea. Check its storage settings and try again.");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        go(false);
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        <span>
          Project title <span className="font-normal text-ink-soft">(optional)</span>
        </span>
        <input value={fields.title ?? ""} maxLength={120} onChange={(event) => set("title", event.target.value)} placeholder="e.g. Summer serum launch" aria-label="Project title" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:col-span-2">
        What is the video about?
        <textarea
          value={fields.objective}
          maxLength={500}
          rows={3}
          onChange={(event) => set("objective", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              go(false);
            }
          }}
          placeholder="e.g. Me showing my new glow serum to women 25 to 34, upbeat, ends with shop now"
          aria-label="What is the video about?"
          data-tour="idea-text"
          className="field-sizing-content min-h-20 w-full resize-none rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm leading-6 text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink/30 focus:ring-4 focus:ring-ink/5"
        />
      </label>
      <div className="sm:col-span-2">
        {submitError ? <p role="alert" className="mb-2 text-sm text-destructive">{submitError}</p> : null}
        {/* One way forward: our AI fills in every step from the idea, and the person checks it before anything is charged. */}
        <button
          type="submit"
          data-tour="idea-continue"
          disabled={!ready || submitting}
          aria-busy={submitting}
          className="btn btn-primary btn-lg w-full sm:w-auto"
        >
          {submitting ? <Spinner className="size-4" /> : null}
          {submitting ? "Opening" : "Continue"}
        </button>
      </div>
    </form>
  );
}
