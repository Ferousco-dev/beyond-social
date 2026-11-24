"use client";

import { useEffect, useRef, useState } from "react";

import { preloadLibrary, useLibrary } from "@/features/asset-library/use-library";
import { AVATAR_PACK_KEY, type ChosenPerson } from "@/features/new-video/components/avatar-pack-panel";
import { OptionSheet } from "@/features/new-video/components/option-sheet";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { toAudience } from "./audience";
import { autofillVideo } from "./autofill-actions";
import { valuesFromBrief } from "./autofill";
import { DRAFT_KEY, STEP_KEY, readDraft } from "./draft";
import { valuesFromAnalysis } from "./analysis-values";
import { useReferenceScript } from "./reference-script";
import { StepCast } from "./step-cast";
import { StepObjective, objectiveErrors } from "./step-objective";
import { StepReview } from "./step-review";
import { StepScript } from "./step-script";
import { toVideoLength } from "./pacing";
import { CONTENT_KINDS, EMPTY_FORM, STEPS, type GenerateFormValues } from "./types";
import type { OwnIdea } from "@/features/new-video/components/own-idea-panel";

const IDEA_KEY = "bs:own-idea";
const QUICK_KEY = "bs:quick-start";

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** The 3-step generation form, with the final review in a popup. Prefills from the New Video flow, autosaves. */
export function GenerateFormShell({ balance, proPrice }: { balance: number | null; proPrice: string | null }) {
  const [step, setStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [values, setValues] = useState<GenerateFormValues>(EMPTY_FORM);
  // Nothing is saved until the earlier draft, idea or script has been read, or the empty form would overwrite them.
  const [hydrated, setHydrated] = useState(false);

  const [showErrors, setShowErrors] = useState(false);

  /** Moves on only when the objective is filled in; otherwise shows every problem and focuses the first. */
  function goTo(target: number): boolean {
    if (target > 0) {
      const problems = Object.keys(objectiveErrors(values));
      if (problems.length > 0) {
        setShowErrors(true);
        setStep(0);
        setTimeout(() => document.getElementById(`field-${problems[0]}`)?.focus(), 0);
        return false;
      }
    }
    setStep(target);
    return true;
  }

  function handleContinue(): void {
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  const library = useLibrary();
  // Read by the idea autofill, which answers after the library may have loaded.
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const [filling, setFilling] = useState<"idle" | "working" | "failed">("idle");
  // The length the script was last written for, so changing it rewrites the script to fit.
  const filledFor = useRef<number | null>(null);
  const [refitting, setRefitting] = useState(false);
  const [refitFailed, setRefitFailed] = useState(false);

  // A pack chosen on New Video fills the face, voice, product and environment, and opens at the first step, ready for what the video is about.
  // It is taken out of storage at once, so a pack nobody applied cannot reappear on a later visit.
  const pack = useRef<{ face?: string; voice?: string; product?: string; environment?: string } | null | undefined>(undefined);
  if (pack.current === undefined) pack.current = null;
  // The person chosen on New Video stays chosen when our AI fills in the rest.
  const person = useRef<ChosenPerson | null>(null);
  useEffect(() => {
    pack.current = readJSON<{ face?: string; voice?: string; product?: string; environment?: string }>(AVATAR_PACK_KEY);
    person.current = readJSON<ChosenPerson>(AVATAR_PACK_KEY);
    try {
      window.sessionStorage.removeItem(AVATAR_PACK_KEY);
    } catch {
      // Nothing to clear.
    }
  }, []);
  useEffect(() => {
    const chosen = pack.current;
    if (library.status !== "ready" || !chosen) return;
    pack.current = null;
    const find = (slot: string | undefined): string => (slot ? (library.assets.find((a) => a.id === slot || a.media_id === slot)?.id ?? "") : "");
    const face = library.assets.find((a) => a.id === find(chosen.face));
    setValues((current) => ({
      ...current,
      speakerMode: "single",
      faceAssetId: find(chosen.face),
      voiceAssetId: find(chosen.voice),
      productAssetId: find(chosen.product),
      environmentAssetId: find(chosen.environment),
      ...(face?.file_kind === "image" ? { firstFrameId: face.media_id } : {}),
    }));
    setStep(0);
  }, [library]);

  // Saved assets are read now, so the Visual assets step opens without waiting.
  useEffect(() => preloadLibrary(), []);

  // Prefill once: an earlier draft, or the idea written on New Video.
  useEffect(() => {
    setHydrated(true);
    const saved = readDraft<GenerateFormValues>(DRAFT_KEY) ?? readJSON<GenerateFormValues>(DRAFT_KEY);
    if (saved) {
      setValues({
        ...EMPTY_FORM,
        ...saved,
        purpose: saved.purpose || EMPTY_FORM.purpose,
        audience: toAudience(saved.audience),
        seconds: toVideoLength(saved.seconds),
        contentKind: CONTENT_KINDS.find((kind) => kind.toLowerCase() === saved.contentKind?.toLowerCase()) ?? EMPTY_FORM.contentKind,
      });
      const savedStep = readDraft<number>(STEP_KEY);
      if (typeof savedStep === "number" && Number.isInteger(savedStep) && savedStep > 0 && savedStep < STEPS.length) setStep(savedStep);
      return;
    }
    const idea = readJSON<OwnIdea>(IDEA_KEY);
    if (!idea) return;
    // A quick start from an idea goes straight to the final review. Back still reaches the rest.
    const quick = readJSON<boolean>(QUICK_KEY);
    try {
      window.sessionStorage.removeItem(QUICK_KEY);
    } catch {
      // Nothing to clear.
    }
    setValues((current) => ({ ...current, title: idea.title ?? "", objective: idea.objective }));
    // The idea fills in every step on its own: the person only checks it. A quick start opens the
    // review once it is filled, so the price is for the finished brief.
    setFilling("working");
    const who = person.current ? `The person in the video is ${person.current.name}.` : "";
    const ideaText = [idea.title, idea.objective, who].filter(Boolean).join(". ");
    setValues((current) => ({ ...current, idea: ideaText }));
    void autofillVideo(ideaText).then((result) => {
      if (result.ok) {
        setValues((current) => {
          const chosen = person.current;
          const next = {
            ...current,
            ...valuesFromBrief(current, result.brief),
            // Someone picked on New Video is who appears, whatever the AI suggested.
            ...(chosen ? { speakerMode: "single" as const, faceAssetId: chosen.face, voiceAssetId: chosen.voice ?? "" } : {}),
          };
          const assets = libraryRef.current.status === "ready" ? libraryRef.current.assets : [];
          const frame = [next.faceAssetId, next.productAssetId, next.environmentAssetId]
            .map((id) => assets.find((asset) => asset.id === id))
            .find((asset) => asset?.file_kind === "image");
          filledFor.current = next.seconds;
          return { ...next, firstFrameId: frame?.media_id ?? next.firstFrameId };
        });
        setFilling("idle");
      } else {
        setFilling("failed");
      }
      if (quick) {
        setStep(STEPS.length - 1);
        setReviewing(true);
      }
    });
  }, []);

  // A new length gets a script written for it, from the same idea, a moment after the last tap.
  // Only the hook, scenes and spoken words change; everything else the person set stays.
  useEffect(() => {
    // Older drafts have no saved idea; what the video is for is the next best thing to write from.
    const source = (values.idea || [values.title, values.objective].filter(Boolean).join(". ")).trim();
    if (!hydrated || source === "" || filling === "working") return;
    if (filledFor.current === null) {
      filledFor.current = values.seconds;
      return;
    }
    if (filledFor.current === values.seconds) return;
    const seconds = values.seconds;
    const timer = window.setTimeout(() => {
      setRefitting(true);
      setRefitFailed(false);
      void autofillVideo(source, seconds).then((result) => {
        setRefitting(false);
        if (!result.ok) {
          setRefitFailed(true);
          return;
        }
        filledFor.current = seconds;
        setValues((current) =>
          current.seconds !== seconds
            ? current
            : { ...current, hook: result.brief.hook || current.hook, scenes: result.brief.scenes || current.scenes, dialogue: result.brief.dialogue || current.dialogue, storyboard: null, voiceover: null },
        );
      });
    }, 700);
    return () => window.clearTimeout(timer);
    // The idea text is read when the length changes; edits to it alone do not rewrite the script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.seconds, hydrated, filling]);

  // Autosave every change; the job itself persists server-side.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      // Private browsing: the form still works for this session.
    }
  }, [values, hydrated]);

  // Remember which step the person was on, so coming back from Assets lands where they left.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STEP_KEY, JSON.stringify(step));
    } catch {
      // Private browsing: the form still works for this session.
    }
  }, [step, hydrated]);

  function patch(next: Partial<GenerateFormValues>): void {
    setValues((current) => ({ ...current, ...next }));
  }

  // A reference video chosen on New Video: its script is written here in the background, and lands in the form.
  const script = useReferenceScript((analysis) => setValues((current) => ({ ...current, ...valuesFromAnalysis(current, analysis) })));
  const writing = script.state.phase === "working";

  return (
    <div className="flex flex-col gap-5">
      {/* Once written, the script is simply in the Script step: no message needed. */}
      {script.state.phase === "working" || script.state.phase === "failed" ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-2 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink">
          {script.state.phase === "working" ? (
            <>
              <span className="flex items-center gap-2">
                <Spinner className="size-4 text-primary" />
                Writing your script from the video. Carry on, it will appear in the Script step.
              </span>
              <span className="block h-1.5 w-full overflow-hidden rounded-full bg-cloud" role="progressbar" aria-label="Script progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={script.state.progress}>
                <span className="block h-full bg-primary transition-[width]" style={{ width: `${script.state.progress}%` }} />
              </span>
            </>
          ) : (
            <span className="flex flex-wrap items-center gap-3 text-destructive" role="alert">
              {script.state.message}
              <button type="button" onClick={script.retry} className="cursor-pointer font-medium text-primary underline underline-offset-2">
                Try again
              </button>
              <button type="button" onClick={script.dismiss} className="cursor-pointer text-ink-soft underline underline-offset-2">
                Write it myself
              </button>
            </span>
          )}
        </div>
      ) : null}
      {refitting ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink">
          <Spinner className="size-4 text-primary" />
          Rewriting the script for {values.seconds >= 60 ? `${values.seconds / 60} min` : `${values.seconds}s`}…
        </div>
      ) : refitFailed ? (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink-soft">
          The script could not be rewritten for this length. Check the Script step.
          <button type="button" onClick={() => setRefitFailed(false)} className="cursor-pointer text-ink-soft underline underline-offset-2 hover:text-ink">
            OK
          </button>
        </div>
      ) : null}
      {filling === "working" ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink">
          <Spinner className="size-4 text-primary" />
          Filling in your video from your idea…
        </div>
      ) : filling === "failed" ? (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink-soft">
          It could not be filled in automatically. Check each step below.
          <button type="button" onClick={() => setFilling("idle")} className="cursor-pointer text-ink-soft underline underline-offset-2 hover:text-ink">
            OK
          </button>
        </div>
      ) : null}
      <ol aria-label="Progress" className="flex gap-1.5">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => goTo(index)}
              aria-current={index === step ? "step" : undefined}
              className="group w-full cursor-pointer py-1 text-left"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-colors",
                  index <= step ? "bg-primary" : "bg-hairline group-hover:bg-cloud",
                )}
              />
              <span className={cn("mt-1.5 hidden text-[11px] sm:block", index === step ? "font-medium text-ink" : "text-ink-soft")}>
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <h2 className="text-lg font-semibold text-ink">{STEPS[step]}</h2>

      {step === 0 ? <StepObjective values={values} onChange={patch} showErrors={showErrors} /> : null}
      {step === 1 ? <StepScript values={values} onChange={patch} /> : null}
      {step === 2 ? <StepCast values={values} onChange={patch} /> : null}

      <div className="flex gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={step < STEPS.length - 1 ? handleContinue : () => { if (goTo(step)) setReviewing(true); }}
          disabled={writing && step === STEPS.length - 1}
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-80"
        >
          {step < STEPS.length - 1 ? "Continue" : writing ? "Writing your script…" : "Review and generate"}
        </button>
      </div>

      <OptionSheet
        open={reviewing}
        title="Final review"
        onClose={() => setReviewing(false)}
      >
        <StepReview values={values} balance={balance} proPrice={proPrice} onChange={patch} />
      </OptionSheet>
    </div>
  );
}
