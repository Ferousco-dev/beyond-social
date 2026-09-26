"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { EnrollCard } from "@/features/voice/enroll-card";
import { type VoiceProfile } from "@/features/voice/actions";
import { type TwinFootage } from "./create-twin-screen";
import { WebcamRecorder } from "./webcam-recorder";
import { type TwinRecording } from "../hooks/use-twin-recorder";

type WizardStep = "record" | "confirm" | "uploading" | "voice" | "done";

export type AvatarWizardResult =
  { readonly status: "ok" } | { readonly status: "error"; readonly message: string };

/**
 * Step-by-step wizard for creating a digital twin.
 *
 * Matches HeyGen's simple progression: Record → Confirm → Submit → Voice.
 * Shows one thing at a time, clear feedback at each step.
 *
 * The voice step exists because an avatar cannot actually speak without a
 * cloned voice (`generate-heygen-avatar/twin.ts` refuses to render one that
 * has none), and that used to mean finishing here, then finding your way to
 * Settings separately to do the other half. It is skipped once this account
 * already has a ready cloned voice: voice is one thing shared by every
 * avatar, not recorded again per twin.
 */
export function AvatarWizard({
  name,
  onComplete,
  onSuccess,
  voiceProfile,
  voicePhrase,
}: {
  name: string;
  onComplete: (footage: TwinFootage) => Promise<AvatarWizardResult>;
  onSuccess: () => void;
  /** This account's saved voice, if any, so a ready one skips this step. */
  voiceProfile: VoiceProfile | null;
  voicePhrase: string;
}): ReactNode {
  const [step, setStep] = useState<WizardStep>("record");
  const [recording, setRecording] = useState<TwinRecording | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const voiceReady = voiceProfile?.cloneStatus === "ready";

  const handleRecordingDone = useCallback((rec: TwinRecording) => {
    setRecording(rec);
    setStep("confirm");
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!recording) return;
    setStep("uploading");
    setUploadError(null);

    // Upload via parent callback (don't use setTimeout to avoid unmount issues)
    const file = new File([recording.blob], "avatar-recording.mp4", {
      type: recording.mimeType,
    });
    try {
      const result = await onComplete({
        file,
        seconds: recording.seconds,
        source: "webcam",
      });
      if (result.status === "error") {
        setUploadError(result.message);
        setStep("confirm");
      } else if (voiceReady) {
        // Already has a voice to speak with: nothing else for this wizard to do.
        setStep("done");
        onSuccess();
      } else {
        setStep("voice");
      }
    } catch {
      setUploadError("Training could not start. Try again.");
      setStep("confirm");
    }
  }, [recording, onComplete, onSuccess, voiceReady]);

  const handleRetry = useCallback(() => {
    setRecording(null);
    setUploadError(null);
    setStep("record");
  }, []);

  // Voice only earns a place in the trail when this run can actually reach
  // it: an account with a ready voice already never sees the "voice" step,
  // so counting it here would leave the indicator stuck one short forever.
  const stepOrder: readonly WizardStep[] = voiceReady
    ? ["record", "confirm", "uploading"]
    : ["record", "confirm", "uploading", "voice"];
  const labels: Record<WizardStep, string> = {
    record: "Record",
    confirm: "Review",
    uploading: "Training",
    voice: "Voice",
    done: "Training",
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      {/* Progress indicators */}
      <div className="mb-10 flex items-center justify-between">
        {stepOrder.map((item, index) => (
          <div key={item} className="flex items-center">
            <div
              aria-label={labels[item]}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                step === item
                  ? "border-primary bg-primary text-white"
                  : stepOrder.indexOf(step) > index
                    ? "border-success bg-success/10 text-success"
                    : "border-hairline text-ink-soft"
              }`}
            >
              {stepOrder.indexOf(step) > index ? (
                <CheckCircle2 className="size-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < stepOrder.length - 1 && (
              <div
                className={`h-1 w-12 ${
                  stepOrder.indexOf(step) > index ? "bg-success" : "bg-hairline"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === "record" ? (
        <div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            Record your avatar
          </h1>
          <p className="mb-6 text-sm text-ink-soft">
            We need 20-120 seconds of video. Speak naturally - show your face and talk clearly.
          </p>
          <WebcamRecorder name={name} onDone={handleRecordingDone} />
        </div>
      ) : step === "confirm" ? (
        <div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            Review your recording
          </h1>
          <p className="mb-6 text-sm text-ink-soft">
            Make sure the audio is clear and your face is visible throughout.
          </p>

          {recording && (
            <div className="mb-6 overflow-hidden rounded-xl border border-hairline">
              <video src={recording.url} controls playsInline className="aspect-video w-full" />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span>Looks good</span>
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Record again
            </button>
          </div>
        </div>
      ) : step === "uploading" ? (
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Spinner className="size-8 text-primary" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            Training your avatar
          </h1>
          <p className="text-sm text-ink-soft">
            We&rsquo;re processing your recording. This takes a few minutes and happens in the
            background. You can leave this page.
          </p>
        </div>
      ) : step === "voice" ? (
        <div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            Now save your voice
          </h1>
          <p className="mb-6 text-sm text-ink-soft">
            Your avatar is training in the background. It still needs a voice to speak with,
            trained by HeyGen the same way: one recording here, reused by this avatar and every
            one after it.
          </p>

          <EnrollCard initial={voiceProfile} phrase={voicePhrase} />

          {/*
            One button, not a "done" and a "later" that do the same thing:
            recording is opt-in and cloning costs credits and asks its own
            confirmation, so there is nothing this step can force. Leaving
            without either just means the "1/2" prompt finds this account
            again next time an avatar tries to speak.
          */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setStep("done");
                onSuccess();
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span>Continue</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : step === "done" ? (
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            Your avatar is training
          </h1>
          <p className="text-sm text-ink-soft">
            {voiceReady
              ? "It already has a voice to speak with. Once training finishes, pick it in the composer and write anything."
              : "Once training finishes and your voice is cloned, pick it in the composer and write anything."}
          </p>
        </div>
      ) : null}

      {uploadError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
