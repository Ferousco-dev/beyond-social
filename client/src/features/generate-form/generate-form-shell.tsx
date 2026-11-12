"use client";

import { useEffect, useRef, useState } from "react";

import { preloadLibrary, useLibrary } from "@/features/asset-library/use-library";
import { AVATAR_PACK_KEY } from "@/features/new-video/components/avatar-pack-panel";
import { OptionSheet } from "@/features/new-video/components/option-sheet";
import { cn } from "@/lib/utils";

import { fromSuggestion, toAudience } from "./audience";
import { StepAssets } from "./step-assets";
import { StepFormat } from "./step-format";
import { StepObjective, objectiveErrors } from "./step-objective";
import { StepReview } from "./step-review";
import { StepScript } from "./step-script";
import { toLength } from "./pacing";
import { CONTENT_KINDS, EMPTY_FORM, MAX_TURNS, STEPS, newTurn, type GenerateFormValues } from "./types";
import type { ApprovedScript } from "@/features/new-video/approved-script";
import type { OwnIdea } from "@/features/new-video/components/own-idea-panel";

export const DRAFT_KEY = "bs:generate-draft";
const IDEA_KEY = "bs:own-idea";
const SCRIPT_KEY = "bs:approved-script";
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

  // A pack chosen on New Video fills the face, voice, product and environment, and opens at the script.
  // It is taken out of storage at once, so a pack nobody applied cannot reappear on a later visit.
  const pack = useRef<{ face?: string; voice?: string; product?: string; environment?: string } | null | undefined>(undefined);
  if (pack.current === undefined) pack.current = null;
  useEffect(() => {
    pack.current = readJSON<{ face?: string; voice?: string; product?: string; environment?: string }>(AVATAR_PACK_KEY);
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
    setValues((current) => ({
      ...current,
      faceAssetId: find(chosen.face),
      voiceAssetId: find(chosen.voice),
      productAssetId: find(chosen.product),
      environmentAssetId: find(chosen.environment),
    }));
    setStep(2);
  }, [library]);

  // Saved assets are read now, so the Visual assets step opens without waiting.
  useEffect(() => preloadLibrary(), []);

  // Prefill once: the own-idea brief, then the approved analysis script.
  useEffect(() => {
    const saved = readJSON<GenerateFormValues>(DRAFT_KEY);
    if (saved) {
      setValues({
        ...EMPTY_FORM,
        ...saved,
        purpose: saved.purpose || EMPTY_FORM.purpose,
        audience: toAudience(saved.audience),
        seconds: toLength(saved.seconds),
        contentKind: CONTENT_KINDS.find((kind) => kind.toLowerCase() === saved.contentKind?.toLowerCase()) ?? EMPTY_FORM.contentKind,
      });
      return;
    }
    const idea = readJSON<OwnIdea>(IDEA_KEY);
    const script = readJSON<ApprovedScript>(SCRIPT_KEY);
    if (!idea && !script) return;
    // The reference video's analysis already settled the topic, audience and
    // look, so setup opens at the script. A quick start from an idea goes
    // straight to the final review. Either way Back still reaches the rest.
    const quick = readJSON<boolean>(QUICK_KEY);
    try {
      window.sessionStorage.removeItem(QUICK_KEY);
    } catch {
      // Nothing to clear.
    }
    if (idea && quick) {
      setStep(STEPS.length - 1);
      setReviewing(true);
    } else if (script) setStep(2);
    setValues((current) => ({
      ...current,
      objective: idea?.objective ?? current.objective,
      audience: script?.audience ? fromSuggestion(script.audience) : idea ? toAudience(idea.audience) : current.audience,
      product: idea?.product ?? current.product,
      visualStyle: idea?.style ?? script?.style ?? current.visualStyle,
      hook: script?.hook ?? current.hook,
      scenes: script?.main ?? current.scenes,
      dialogue: script?.dialogue ?? current.dialogue,
      cta: script?.cta ?? current.cta,
      seconds: script?.seconds ?? current.seconds,
      ...(script?.speakers !== undefined && script.speakers > 1
        ? { speakerMode: "conversation" as const, turns: Array.from({ length: Math.min(script.speakers, MAX_TURNS) }, newTurn) }
        : {}),
    }));
  }, []);

  // Autosave every change; the job itself persists server-side.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      // Private browsing: the form still works for this session.
    }
  }, [values]);

  function patch(next: Partial<GenerateFormValues>): void {
    setValues((current) => ({ ...current, ...next }));
  }

  return (
    <div className="flex flex-col gap-5">
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
      {step === 1 ? <StepFormat values={values} onChange={patch} /> : null}
      {step === 2 ? (
        <div className="flex flex-col gap-8">
          <StepScript values={values} onChange={patch} />
          <section aria-labelledby="assets-heading" className="flex flex-col gap-3 border-t border-hairline pt-6">
            <h3 id="assets-heading" className="text-base font-semibold text-ink">Visual assets</h3>
            <StepAssets values={values} onChange={patch} />
          </section>
        </div>
      ) : null}

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
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-80"
        >
          {step < STEPS.length - 1 ? "Continue" : "Review and generate"}
        </button>
      </div>

      <OptionSheet
        open={reviewing}
        title="Final review"
        description="Check the summary and the credit cost, then generate."
        onClose={() => setReviewing(false)}
      >
        <StepReview values={values} balance={balance} proPrice={proPrice} onChange={patch} />
      </OptionSheet>
    </div>
  );
}
