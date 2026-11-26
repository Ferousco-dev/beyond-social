"use client";

import { type Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useOnline } from "@/hooks/use-online";
import { creditsChanged } from "@/features/billing/live-balance";
import { useLoad } from "@/lib/hooks/use-load";
import { createEditorProject } from "@/features/studio/actions";
import { fitGeneration } from "@/features/studio/core/fit-generation.ts";

import { emailWhenReady } from "@/features/settings/preferences";

import { buildAvatarScript } from "./brief";
import { clearDraft } from "./draft";
import { CreditShortfallDialog } from "./credit-shortfall-dialog";
import { PacingNote } from "./length-picker";
import { fits, isLong, spokenText } from "./pacing";
import { ReviewSummary } from "./review-summary";
import { clipSound, quoteGeneration, scriptOf, startGeneration, videoKind } from "./start-generation";
import { turnsReady, type GenerateFormValues } from "./types";

/** Step E: review, credit estimate, confirm, progress, done. */
export function StepReview({
  values,
  balance,
  proPrice,
  onChange,
}: {
  values: GenerateFormValues;
  balance: number | null;
  /** The monthly Pro price, for a Free member only; null hides the offer. */
  proPrice: string | null;
  onChange: (patch: Partial<GenerateFormValues>) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [shortOpen, setShortOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const kind = videoKind(values);
  const prompt = scriptOf(values);
  const avatarScript = buildAvatarScript(values);
  const promptLength = Array.from(prompt).length;
  // A clip has a fixed length, so speech that does not fit would be rushed.
  const rushed = kind === "clip" && !fits(spokenText(values), values.seconds);
  const missingWords =
    kind === "conversation" ? !turnsReady(values.turns) : kind === "talking" && avatarScript.trim() === "";
  // Re-quote only when something that changes the price changes.
  // Spoken words switch sound on, which is priced higher, so they belong in the key.
  const quoteKey = kind === "clip" ? `clip:${values.seconds}:${clipSound(values)}` : prompt;

  const online = useOnline();

  const quote = useLoad(() => quoteGeneration(values), missingWords ? null : `${quoteAttempt}:${quoteKey}`);
  const credits = quote.status === "done" ? quote.value : null;
  const quoteError =
    quote.status === "failed"
      ? "Something went wrong while checking the cost. Please try again."
      : quote.status === "done" && quote.value === null
        ? "Could not estimate the generation cost. Please try again."
        : null;
  // Said at the value moment, before a click that could only fail: the cost is known and so is the balance.
  const short = balance !== null && credits !== null && credits > balance;

  async function generate() {
    setConfirming(false);
    setError(null);
    setStarting(true);
    try {
      // Whether to email is a global choice in Settings, not a question asked each time.
      const started = await startGeneration({ ...values, notifyEmail: emailWhenReady() });
      creditsChanged();
      if (!started.ok) {
        setError(started.message);
        return;
      }
      // The video has started and been paid for, so the project must save: the record is cut to its
      // limits and the title to its length rather than refused.
      const generation = fitGeneration(started.generation);
      const title = (values.title.trim() || values.objective.trim() || (kind === "conversation" ? "Conversation" : kind === "talking" ? "Talking video" : "New video")).slice(0, 120).trim();
      const project = await createEditorProject({ title, generation });
      if (!project.ok) {
        setError(project.message);
        return;
      }
      clearDraft();
      router.push(`/editor/${project.value}?job=${generation.jobId}&script=${encodeURIComponent(generation.script)}` as Route);
    } catch {
      setError("Generation did not start. Your project is saved. Try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ReviewSummary values={values} avatarScript={avatarScript} credits={credits} balance={balance} />

      {quoteError ? (
        <p role="alert" className="text-sm text-destructive">
          {quoteError} <button type="button" onClick={() => setQuoteAttempt((attempt) => attempt + 1)} className="font-medium underline underline-offset-2">Retry estimate</button>
        </p>
      ) : null}


      {rushed ? <PacingNote spoken={spokenText(values)} seconds={values.seconds} onPick={(seconds) => onChange({ seconds })} /> : null}

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary bg-paper p-4" role="alertdialog" aria-label="Confirm generation">
          <p className="text-sm text-ink">
            Start generation for <span className="font-semibold tabular-nums">{credits ?? "…" } credits</span>?
            {balance !== null ? ` You have ${balance}.` : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={starting || !online}
              className="btn btn-primary btn-md flex-1"
            >
              {starting ? "Opening editor…" : "Confirm and generate"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={starting}
              className="btn btn-secondary btn-md"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            if (missingWords) {
              setError(kind === "conversation" ? "Give every turn a face, a voice and its words before generating." : "Add the words your voice recording says before generating.");
              return;
            }
            if (short) {
              setShortOpen(true);
              return;
            }
            if (promptLength > 2500 && !isLong(values.seconds)) {
              setError("This prompt is over 2,500 characters. Shorten the script before generating.");
              return;
            }
            setConfirming(true);
          }}
          disabled={!online || credits === null || quoteError !== null || rushed}
          className="btn btn-primary btn-md"
        >
          Generate video
        </button>
      )}
      {!online ? <p className="text-sm text-ink-soft">You are offline. Your answers are saved on this device. Reconnect to generate.</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {short && credits !== null && balance !== null ? (
        <CreditShortfallDialog open={shortOpen} onClose={() => setShortOpen(false)} cost={credits} balance={balance} proPrice={proPrice} />
      ) : null}
    </div>
  );
}
