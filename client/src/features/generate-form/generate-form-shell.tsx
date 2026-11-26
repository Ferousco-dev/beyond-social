"use client";

import { Coins } from "lucide-react";
import { useRef, useState } from "react";

import { preloadLibrary, useLibrary } from "@/features/asset-library/use-library";
import { AVATAR_PACK_KEY, type ChosenPerson } from "@/features/new-video/components/avatar-pack-panel";
import { OptionSheet } from "@/features/new-video/components/option-sheet";
import { Spinner } from "@/components/ui/spinner";
import { creditsChanged } from "@/features/billing/live-balance";
import { useOnMount } from "@/lib/hooks/use-page-effects";
import { useSavedValue } from "@/lib/hooks/use-saved-value";
import { useTimeout } from "@/lib/hooks/use-timers";

import { toAudience } from "./audience";
import { autofillVideo } from "./autofill-actions";
import { valuesFromBrief } from "./autofill";
import { DRAFT_KEY, readDraft } from "./draft";
import { valuesFromAnalysis } from "./analysis-values";
import { useReferenceScript } from "./reference-script";
import { QuickForm } from "./quick-form";
import { useSceneQuotes } from "./scene-quotes";
import { recallScript, rememberScript, type ScriptStore } from "./script-cache";
import { StepReview } from "./step-review";
import { spokenText, toVideoLength } from "./pacing";
import { CONTENT_KINDS, EMPTY_FORM, type GenerateFormValues } from "./types";
import type { OwnIdea } from "@/features/new-video/components/own-idea-panel";

const IDEA_KEY = "bs:own-idea";
const QUICK_KEY = "bs:quick-start";
/** Where written scripts are kept for a while, or nothing when the browser blocks storage. */
function scriptStore(): ScriptStore {
  try {
    return window.sessionStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined };
  }
}

/** What the script is written from: the idea (or, for older drafts, the title and goal) and any extras. */
function scriptSource(values: GenerateFormValues): string {
  const idea = (values.idea || [values.title, values.objective].filter(Boolean).join(". ")).trim();
  return [idea, values.extras.trim() ? `Extras: ${values.extras.trim()}` : ""].filter(Boolean).join("\n\n");
}

/** How long after the last length tap the script is rewritten for it. */
const REFIT_DELAY_MS = 700;

interface AvatarPack {
  readonly face?: string;
  readonly voice?: string;
  readonly product?: string;
  readonly environment?: string;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Takes a one-time hand-off out of storage, so it cannot reappear on a later visit. */
function removeKey(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

/** What our AI is asked when the idea changed or extras were added, keeping the person's script unless told otherwise. */
function refinePrompt(values: GenerateFormValues): string {
  const script = [
    values.hook.trim() ? `Opening: ${values.hook.trim()}` : "",
    values.scenes.trim() ? `Scenes: ${values.scenes.trim()}` : "",
    values.dialogue.trim() ? `Said: ${values.dialogue.trim()}` : "",
  ].filter(Boolean);
  return [
    values.idea.trim(),
    values.extras.trim() ? `Extras: ${values.extras.trim()}` : "",
    script.length > 0 ? `Keep this script unless the idea or extras ask for a change.\n${script.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Configure video on one screen, with the final review in a popup. Prefills from the New Video flow, autosaves. */
export function GenerateFormShell({ balance, proPrice }: { balance: number | null; proPrice: string | null }) {
  const [reviewing, setReviewing] = useState(false);
  const [values, setValues] = useState<GenerateFormValues>(EMPTY_FORM);
  // Nothing is saved until the earlier draft, idea or script has been read, or the empty form would overwrite them.
  const [hydrated, setHydrated] = useState(false);

  const [ideaError, setIdeaError] = useState<string | null>(null);
  // The idea and extras our AI last wrote the form from, so Generate only asks again when they changed.
  const appliedPrompt = useRef<{ idea: string; extras: string } | null>(null);
  const [refining, setRefining] = useState<"idle" | "working" | "failed">("idle");

  const library = useLibrary();
  // Read by the idea autofill, which answers after the library may have loaded.
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const [filling, setFilling] = useState<"idle" | "working" | "failed">("idle");
  // The length the script was last written for, so changing it rewrites the script to fit.
  const filledFor = useRef<number | null>(null);
  const [refitting, setRefitting] = useState(false);
  const [refitFailed, setRefitFailed] = useState(false);

  /** A pack chosen on New Video, waiting for the library so its slots can be matched to saved assets. */
  const [pack, setPack] = useState<AvatarPack | null>(null);
  /** The person chosen on New Video stays chosen when our AI fills in the rest. */
  const person = useRef<ChosenPerson | null>(null);
  /** A length the person just picked, rewritten for a moment after the last tap. */
  const [refitFor, setRefitFor] = useState<number | null>(null);

  if (pack && library.status === "ready") {
    setPack(null);
    const find = (slot: string | undefined): string => (slot ? (library.assets.find((a) => a.id === slot || a.media_id === slot)?.id ?? "") : "");
    const face = library.assets.find((a) => a.id === find(pack.face));
    setValues((current) => ({
      ...current,
      speakerMode: "single",
      faceAssetId: find(pack.face),
      voiceAssetId: "",
      productAssetId: find(pack.product),
      environmentAssetId: find(pack.environment),
      ...(face?.file_kind === "image" ? { firstFrameId: face.media_id } : {}),
    }));
  }

  useOnMount(() => {
    const chosenPack = readJSON<AvatarPack>(AVATAR_PACK_KEY);
    if (chosenPack) {
      setPack(chosenPack);
      person.current = readJSON<ChosenPerson>(AVATAR_PACK_KEY);
    }
    removeKey(AVATAR_PACK_KEY);
    preloadLibrary();
    prefill();
  });

  /** Fills the form once: an earlier draft, or the idea written on New Video. */
  function prefill(): void {
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
      return;
    }
    const idea = readJSON<OwnIdea>(IDEA_KEY);
    if (!idea) return;
    const quick = readJSON<boolean>(QUICK_KEY);
    removeKey(QUICK_KEY);
    setValues((current) => ({ ...current, title: idea.title ?? "", objective: idea.objective }));
    setFilling("working");
    const who = person.current ? `The person in the video is ${person.current.name}.` : "";
    const ideaText = [idea.title, idea.objective, who].filter(Boolean).join(". ");
    setValues((current) => ({ ...current, idea: ideaText }));
    appliedPrompt.current = { idea: ideaText.trim(), extras: "" };
    void autofillVideo(ideaText).then((result) => {
      creditsChanged();
      if (result.ok) {
        setValues((current) => {
          const chosen = person.current;
          const next = {
            ...current,
            ...valuesFromBrief(current, result.brief),
            ...(chosen ? { speakerMode: "single" as const, faceAssetId: chosen.face, voiceAssetId: "" } : {}),
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
      if (quick) setReviewing(true);
    });
  }

  /**
   * Rewrites the hook, scenes and spoken words for the length just picked, from
   * the same idea. Everything else the person set stays. Waits while the first
   * fill is still writing.
   */
  function refit(): void {
    const seconds = refitFor;
    setRefitFor(null);
    if (seconds === null || filledFor.current === seconds || values.seconds !== seconds) return;
    const source = scriptSource(values);
    if (source === "") return;
    setRefitting(true);
    setRefitFailed(false);
    void autofillVideo(source, seconds).then((result) => {
      setRefitting(false);
      creditsChanged();
      if (!result.ok) {
        setRefitFailed(true);
        return;
      }
      filledFor.current = seconds;
      rememberScript(scriptStore(), source, seconds, { hook: result.brief.hook, scenes: result.brief.scenes, dialogue: result.brief.dialogue });
      setValues((current) =>
        current.seconds !== seconds
          ? current
          : { ...current, hook: result.brief.hook || current.hook, scenes: result.brief.scenes || current.scenes, dialogue: result.brief.dialogue || current.dialogue, storyboard: null, voiceover: null },
      );
    });
  }
  useTimeout(refit, refitFor !== null && filling !== "working" ? REFIT_DELAY_MS : null, refitFor);

  useSavedValue(DRAFT_KEY, values, hydrated);

  function patch(next: Partial<GenerateFormValues>): void {
    if (next.idea !== undefined) setIdeaError(null);
    if (next.seconds !== undefined && next.seconds !== values.seconds) {
      if (filledFor.current === null) filledFor.current = values.seconds;
      const source = scriptSource(values);
      if (filledFor.current === values.seconds) rememberScript(scriptStore(), source, values.seconds, { hook: values.hook, scenes: values.scenes, dialogue: values.dialogue });
      const written = recallScript(scriptStore(), source, next.seconds);
      if (written) {
        filledFor.current = next.seconds;
        setRefitFor(null);
        setValues((current) => ({ ...current, ...next, ...written, storyboard: null, voiceover: null }));
        return;
      }
      setRefitFor(next.seconds);
    }
    setValues((current) => ({ ...current, ...next }));
  }

  const quotes = useSceneQuotes(spokenText(values).trim() !== "");
  const cost = quotes[toVideoLength(values.seconds)];

  /**
   * Generate: when the idea changed or extras were added, our AI folds them in
   * first, keeping who is in it, the length and the platform. Then the final
   * review opens with the price, so nothing is spent before the person confirms.
   */
  async function generate(): Promise<void> {
    const idea = values.idea.trim() || [values.title, values.objective].filter(Boolean).join(". ").trim();
    if (idea === "") {
      setIdeaError("Say what the video is about in a sentence or two.");
      document.getElementById("field-idea")?.focus();
      return;
    }
    const extras = values.extras.trim();
    const last = appliedPrompt.current;
    const changed = extras !== (last?.extras ?? "") || (values.idea.trim() !== "" && values.idea.trim() !== (last?.idea ?? values.idea.trim()));
    if (!changed) {
      if (values.objective.trim() === "") patch({ objective: idea });
      setReviewing(true);
      return;
    }
    setRefining("working");
    const result = await autofillVideo(refinePrompt({ ...values, idea }), values.seconds);
    creditsChanged();
    if (!result.ok) {
      setRefining("failed");
      return;
    }
    appliedPrompt.current = { idea: values.idea.trim(), extras };
    setValues((current) => {
      const next = { ...current, ...valuesFromBrief(current, result.brief) };
      // What the person picked on this screen stays as they picked it.
      return {
        ...next,
        objective: next.objective.trim() || idea,
        platform: current.platform,
        seconds: current.seconds,
        speakerMode: current.speakerMode,
        turns: current.turns,
        faceAssetId: current.faceAssetId,
        voiceAssetId: current.voiceAssetId,
        productAssetId: current.productAssetId,
        environmentAssetId: current.environmentAssetId,
        firstFrameId: current.firstFrameId,
      };
    });
    filledFor.current = values.seconds;
    setRefining("idle");
    setReviewing(true);
  }

  // A reference video chosen on New Video: its script is written here in the background, and lands in the form.
  const script = useReferenceScript((analysis) => setValues((current) => ({ ...current, ...valuesFromAnalysis(current, analysis) })));
  const writing = script.state.phase === "working";

  return (
    <div className="flex flex-col gap-5">
      {/* Once written, the script is simply under Script: no message needed. */}
      {script.state.phase === "working" || script.state.phase === "failed" ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-2 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink">
          {script.state.phase === "working" ? (
            <>
              <span className="flex items-center gap-2">
                <Spinner className="size-4 text-primary" />
                Writing your script from the video. Carry on, it will appear under Script.
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
          The script could not be rewritten for this length. Check it under Script.
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
          It could not be filled in automatically. Fill in the parts below.
          <button type="button" onClick={() => setFilling("idle")} className="cursor-pointer text-ink-soft underline underline-offset-2 hover:text-ink">
            OK
          </button>
        </div>
      ) : null}
      <QuickForm values={values} onChange={patch} ideaError={ideaError} />

      {refining === "failed" ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-cloud/50 p-3 text-sm text-ink">
          Your extras could not be added just now.
          <button type="button" onClick={() => void generate()} className="cursor-pointer font-medium text-primary underline underline-offset-2">
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              setRefining("idle");
              setReviewing(true);
            }}
            className="cursor-pointer text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Review without them
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-hairline pt-4">
        <span className="flex-1" role="status">
          {typeof cost === "number" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cloud px-2.5 py-1 text-sm font-medium tabular-nums text-ink" title={`About ${cost} credits`}>
              <Coins className="size-3.5 text-ink-soft" aria-hidden />
              {cost}
              <span className="sr-only"> credits</span>
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={() => void generate()}
          data-tour="video-generate"
          disabled={writing || refining === "working" || filling === "working"}
          className="btn btn-primary btn-md"
        >
          {refining === "working" ? (
            <>
              <Spinner className="size-4" />
              Adding your extras…
            </>
          ) : writing ? (
            "Writing your script…"
          ) : (
            "Generate video"
          )}
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
