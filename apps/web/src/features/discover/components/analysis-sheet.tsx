"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Clapperboard, Sparkles } from "lucide-react";

import { HOOK_PATTERN_LABELS } from "@/lib/hooks/taxonomy";
import { type PostAnalysis } from "@/lib/tiktok/analyse";
import { structureBeats } from "@/lib/tiktok/structure";
import { cn } from "@/lib/utils";

/**
 * What we read into a post, before anything is made from it.
 *
 * Shown rather than applied silently, because the analysis is inferred from a
 * caption, some numbers and sometimes a transcript, and the user is the only one
 * who can tell whether it landed. Handing the brief straight to the generator
 * would spend a credit on our guess about somebody else's video.
 *
 * The confidence is stated in the same breath. A low-confidence read is still
 * worth showing; presenting it as though it were a high one is not.
 */

const CONFIDENCE: Readonly<Record<PostAnalysis["confidence"], { label: string; tone: string }>> = {
  high: { label: "Read from the caption and transcript", tone: "bg-primary/10 text-primary" },
  medium: { label: "Partly inferred", tone: "bg-cloud text-ink-soft" },
  low: { label: "Mostly inferred from the caption", tone: "bg-cloud text-ink-soft" },
};

export function AnalysisSheet({
  analysis,
  handle,
  open,
  onOpenChange,
  onUse,
  onWriteScript,
}: {
  analysis: PostAnalysis | null;
  handle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (brief: string) => void;
  /** Takes the same analysis further: a shot-by-shot script rather than a paragraph. */
  onWriteScript: () => void;
}) {
  const confidence = analysis ? CONFIDENCE[analysis.confidence] : null;
  const beats = analysis ? structureBeats(analysis.structure) : [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-hairline bg-paper p-6 shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          {analysis === null ? null : (
            <>
              <Dialog.Title className="text-lg font-semibold text-ink">
                {analysis.format}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-xs text-ink-soft">
                What we could work out from @{handle}&rsquo;s post. We cannot see the video itself,
                only what TikTok reports about it.
              </Dialog.Description>

              {confidence ? (
                <p
                  className={cn(
                    "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium",
                    confidence.tone,
                  )}
                >
                  {confidence.label}
                </p>
              ) : null}

              <section className="mt-5">
                <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Hook
                  <span className="rounded-full bg-cloud px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-ink-soft">
                    {HOOK_PATTERN_LABELS[analysis.hookPattern]}
                  </span>
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{analysis.hook}</p>
              </section>

              {beats.length > 0 ? (
                <section className="mt-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                    How it runs
                  </h3>
                  <ol className="mt-2 space-y-2">
                    {beats.map(({ label, detail }) => (
                      <li key={label} className="flex gap-3 text-sm text-ink">
                        <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-cloud px-2 text-[11px] font-medium text-ink-soft">
                          {label}
                        </span>
                        {detail}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              <section className="mt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Why it worked
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {analysis.whyItWorks}
                </p>
              </section>

              <section className="mt-4 rounded-xl bg-cloud p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Your version
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink">{analysis.brief}</p>
              </section>

              {/* Two ways on, and the order is the recommendation. A script is
                  what makes the beats, the lines and the cuts survive into the
                  render; the paragraph is for somebody who would rather write
                  their own direction in the composer. */}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Not this one
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => onUse(analysis.brief)}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Sparkles className="size-4" aria-hidden />
                  Just the brief
                </button>
                <button
                  type="button"
                  onClick={onWriteScript}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Clapperboard className="size-4" aria-hidden />
                  Write the script
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
