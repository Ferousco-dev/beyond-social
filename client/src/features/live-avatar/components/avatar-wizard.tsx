"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { type TwinRecording } from "../hooks/use-twin-recorder";
import { usePhoneHandoff } from "../hooks/use-phone-handoff";
import { PhoneHandoff } from "./phone-handoff";
import { WebcamRecorder } from "./webcam-recorder";

/** What the recorder hands back: a file ready to upload. */
export interface TwinFootage {
  readonly file: File;
  readonly seconds: number | null;
  readonly source: "webcam" | "upload";
}

type WizardStep = "record" | "confirm" | "uploading" | "done";

export type AvatarWizardResult =
  { readonly status: "ok" } | { readonly status: "error"; readonly message: string };

/**
 * Step-by-step wizard for creating a digital twin.
 *
 * Matches HeyGen's simple progression: Record → Confirm → Submit → Voice.
 * Shows one thing at a time, clear feedback at each step.
 *
 * There is no voice step: HeyGen clones the voice from this same recording as
 * part of training, so the avatar arrives with a voice. Choosing a different
 * one happens where videos are made.
 */
export function AvatarWizard({
  name,
  onComplete,
  onSuccess,
}: {
  name: string;
  onComplete: (footage: TwinFootage) => Promise<AvatarWizardResult>;
  onSuccess: () => void;
}): ReactNode {
  const [step, setStep] = useState<WizardStep>("record");
  const [recording, setRecording] = useState<TwinRecording | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [onPhone, setOnPhone] = useState(false);
  const phone = usePhoneHandoff(onPhone, () => {
    setStep("done");
    onSuccess();
  });

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
      } else {
        setStep("done");
        onSuccess();
      }
    } catch {
      setUploadError("Training could not start. Try again.");
      setStep("confirm");
    }
  }, [recording, onComplete, onSuccess]);

  const handleRetry = useCallback(() => {
    setRecording(null);
    setUploadError(null);
    setStep("record");
  }, []);

  const stepOrder: readonly WizardStep[] = ["record", "confirm", "uploading"];
  const labels: Record<WizardStep, string> = {
    record: "Record",
    confirm: "Review",
    uploading: "Training",
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
            We need 15 seconds to 10 minutes of video; about two minutes works best. Speak naturally,
            show your face and talk clearly.
          </p>
          {onPhone ? (
            <PhoneHandoff url={phone.url} expiresAt={phone.expiresAt} onRefresh={phone.refresh} />
          ) : (
            <WebcamRecorder name={name} onDone={handleRecordingDone} />
          )}
          <button
            type="button"
            onClick={() => setOnPhone((current) => !current)}
            className="mt-4 cursor-pointer text-sm text-primary underline underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {onPhone ? "Record on this computer instead" : "Record on your phone instead"}
          </button>
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
      ) : step === "done" ? (
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            Your avatar is training
          </h1>
          <p className="text-sm text-ink-soft">
            Once training and the consent step finish, it will have its own voice. Then write a
            script on this page and it will say it.
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
