"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { type TwinFootage } from "./create-twin-screen";
import { WebcamRecorder } from "./webcam-recorder";
import { type TwinRecording } from "../hooks/use-twin-recorder";

type WizardStep = "record" | "confirm" | "uploading" | "done";

/**
 * Step-by-step wizard for creating a digital twin.
 *
 * Matches HeyGen's simple progression: Record → Confirm → Submit.
 * Shows one thing at a time, clear feedback at each step.
 */
export function AvatarWizard({
  name,
  onComplete,
}: {
  name: string;
  onComplete: (footage: TwinFootage) => void;
}): ReactNode {
  const [step, setStep] = useState<WizardStep>("record");
  const [recording, setRecording] = useState<TwinRecording | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleRecordingDone = useCallback((rec: TwinRecording) => {
    setRecording(rec);
    setStep("confirm");
  }, []);

  const handleConfirm = useCallback(() => {
    if (!recording) return;
    setStep("uploading");
    setUploadError(null);

    // Upload via parent callback (don't use setTimeout to avoid unmount issues)
    const file = new File([recording.blob], "avatar-recording.mp4", {
      type: recording.mimeType,
    });
    onComplete({
      file,
      seconds: recording.seconds,
      source: "webcam",
    });
  }, [recording, onComplete]);

  const handleRetry = useCallback(() => {
    setRecording(null);
    setUploadError(null);
    setStep("record");
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      {/* Progress indicators */}
      <div className="mb-10 flex items-center justify-between">
        {[
          { step: "record", label: "Record" },
          { step: "confirm", label: "Review" },
          { step: "uploading", label: "Training" },
        ].map((item, index) => (
          <div key={item.step} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                step === item.step
                  ? "border-primary bg-primary text-white"
                  : ["record", "confirm", "uploading"].indexOf(step) >
                      ["record", "confirm", "uploading"].indexOf(item.step)
                    ? "border-success bg-success/10 text-success"
                    : "border-hairline text-ink-soft"
              }`}
            >
              {["record", "confirm", "uploading"].indexOf(step) >
              ["record", "confirm", "uploading"].indexOf(item.step) ? (
                <CheckCircle2 className="size-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < 2 && (
              <div
                className={`h-1 w-12 ${
                  ["record", "confirm", "uploading"].indexOf(step) >
                  ["record", "confirm", "uploading"].indexOf(item.step)
                    ? "bg-success"
                    : "bg-hairline"
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
              <video
                src={recording.url}
                controls
                playsInline
                className="aspect-video w-full"
              />
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
      ) : step === "uploading" || step === "done" ? (
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            {step === "uploading" ? (
              <Spinner className="size-8 text-primary" />
            ) : (
              <CheckCircle2 className="size-8 text-success" />
            )}
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">
            {step === "uploading" ? "Training your avatar" : "Avatar ready!"}
          </h1>
          <p className="text-sm text-ink-soft">
            {step === "uploading"
              ? "HeyGen is processing your recording. This takes a few minutes and happens in the background. You can leave this page."
              : "Your avatar has been trained and is ready to use in videos."}
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
