"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import type { LibraryAsset } from "@/features/asset-library/types";
import { cn } from "@/lib/utils";

import { autofillVideo } from "./autofill-actions";
import { valuesFromBrief } from "./autofill";
import type { GenerateFormValues } from "./types";

const EXAMPLE = "A 30-second video of me showing my new glow serum to women 25 to 34. Upbeat, filmed at home, ends with shop now.";

/**
 * The quick way in: one or two sentences, and our AI fills every step,
 * including which saved face, voice, product and place to use. Every answer
 * stays editable in the steps below.
 */
export function AutofillCard({
  values,
  assets,
  onFill,
  onReview,
}: {
  values: GenerateFormValues;
  /** The person's library, so a filled face or product also sets the opening frame. */
  assets: readonly LibraryAsset[];
  onFill: (patch: Partial<GenerateFormValues>) => void;
  onReview: () => void;
}): ReactNode {
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState<string | null>(null);

  async function fill(): Promise<void> {
    const text = idea.trim();
    if (text === "" || busy) return;
    setBusy(true);
    setError(null);
    const result = await autofillVideo(text);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const patch = valuesFromBrief(values, result.brief);
    const next = { ...values, ...patch };
    const frame = [next.faceAssetId, next.productAssetId, next.environmentAssetId]
      .map((id) => assets.find((asset) => asset.id === id))
      .find((asset) => asset?.file_kind === "image");
    onFill({ ...patch, firstFrameId: frame?.media_id ?? "" });
    setFilled(text);
  }

  if (filled !== null) {
    const picked = [values.faceAssetId, values.productAssetId, values.environmentAssetId]
      .map((id) => assets.find((asset) => asset.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    const facts = [lengthLabel(values.seconds), values.platform, values.visualStyle, ...picked].filter(Boolean);
    return (
      <section aria-label="Filled in by our AI" className="rounded-2xl border border-hairline bg-cloud/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{values.title || "Your video"} is ready to check</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{values.objective}</p>
            {facts.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="What was chosen">
                {facts.map((fact) => (
                  <li key={fact} className="rounded-full border border-hairline bg-paper px-2.5 py-1 text-xs text-ink">
                    {fact}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setFilled(null)}
            className="inline-flex h-10 cursor-pointer items-center rounded-lg px-3.5 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
          >
            Describe it again
          </button>
          <button
            type="button"
            onClick={onReview}
            className="group inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Review and generate
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-soft">Or check each step below. Everything can be changed.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="autofill-heading" className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
      <h2 id="autofill-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sparkles className="size-4 text-primary" aria-hidden />
        Describe your video
      </h2>
      <p className="mt-1 text-sm text-ink-soft">One or two sentences. Our AI fills in every step, including who and what from your assets.</p>
      <textarea
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void fill();
          }
        }}
        rows={3}
        maxLength={2000}
        placeholder={EXAMPLE}
        aria-label="Describe your video"
        className="mt-3 block min-h-24 w-full resize-none rounded-xl border border-hairline bg-transparent p-3 text-sm leading-6 text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-ink/25 field-sizing-content"
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="hidden text-xs text-ink-soft sm:inline">Free · ⌘ Enter</span>
        <button
          type="button"
          onClick={() => void fill()}
          disabled={idea.trim() === "" || busy}
          className={cn(
            "inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
            busy && "disabled:opacity-80",
          )}
        >
          {busy ? <Spinner className="size-4" /> : <Sparkles className="size-4" aria-hidden />}
          {busy ? "Filling it in…" : "Fill it in for me"}
        </button>
      </div>
    </section>
  );
}

function lengthLabel(seconds: number): string {
  return seconds >= 60 ? `${seconds / 60} min` : `${seconds}s`;
}
