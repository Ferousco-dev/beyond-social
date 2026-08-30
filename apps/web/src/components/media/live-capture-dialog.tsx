"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Loader2, RotateCcw, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Recording yourself, live, for a talking-avatar render.
 *
 * A photo plus a voice clip already makes an avatar render, whether attached in
 * the composer or saved as your avatar in Assets; this is a way to get that
 * photo without leaving the app to find one. What comes out of here is an
 * ordinary `File`, handed to whatever upload path the caller already uses for a
 * picked-from-disk photo, so nothing downstream needs to know a camera was
 * involved.
 *
 * Captures a still frame rather than a video clip: the render this feeds still
 * takes a photo and a separate voice recording, not a talking video, so a
 * moving clip would be trimmed down to one frame anyway. Framed as "go live"
 * instead of "take a photo" because the point is the immediacy, not the format.
 */

type Stage = "intro" | "loading" | "preview" | "denied" | "error";

export function LiveCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setStage("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("preview");
    } catch (error) {
      setStage(
        error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error",
      );
    }
  }, []);

  // The `<video>` element only exists once `stage` is "preview" (it is not
  // rendered at all before then), so assigning `srcObject` from inside
  // `startCamera` itself always landed on a still-null ref: the element had
  // not mounted yet on first open, and only appeared to work on a retake
  // because the previous stream's element was still around. Attaching here,
  // after the state that mounts the element has actually committed, is what
  // makes the first open work too.
  useEffect(() => {
    if (stage === "preview" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  // Torn down on every close, not just unmount: a dialog left open in the
  // background with the camera still running is a light on nobody asked for.
  useEffect(() => {
    if (!open) {
      stopStream();
      setStage("intro");
      setShot((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return null;
      });
    }
    return stopStream;
  }, [open, stopStream]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        setShot({ blob, url: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.92,
    );
  }

  function retake() {
    setShot((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    void startCamera();
  }

  function confirm() {
    if (!shot) return;
    onCapture(new File([shot.blob], "live-capture.jpg", { type: "image/jpeg" }));
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-hairline bg-paper p-6 shadow-card outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-ink">Go live</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          {stage === "intro" ? (
            <div className="mt-4">
              <p className="text-sm leading-relaxed text-ink-soft">
                Record a photo of yourself, then say what you want in your own voice. Put the two
                together and your photo speaks it, no filming a whole video required.
              </p>
              <ol className="mt-4 space-y-2.5 text-sm text-ink-soft">
                <li className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium text-ink">
                    1
                  </span>
                  Face the camera, well lit, and take a photo
                </li>
                <li className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium text-ink">
                    2
                  </span>
                  Record yourself saying the line
                </li>
                <li className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cloud text-xs font-medium text-ink">
                    3
                  </span>
                  Describe the video and send
                </li>
              </ol>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="mt-5 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Camera className="size-4" aria-hidden />
                Open camera
              </button>
            </div>
          ) : null}

          {stage === "loading" ? (
            <div className="mt-4 flex aspect-square items-center justify-center rounded-xl bg-cloud">
              <Loader2 className="size-6 animate-spin text-ink-soft" aria-hidden />
            </div>
          ) : null}

          {stage === "denied" || stage === "error" ? (
            <div className="mt-4">
              <p className="text-sm leading-relaxed text-destructive">
                {stage === "denied"
                  ? "Camera access was blocked. Allow it in your browser's site settings, then try again."
                  : "Could not reach a camera on this device."}
              </p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-full border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud"
              >
                Try again
              </button>
            </div>
          ) : null}

          {stage === "preview" ? (
            <div className="mt-4">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-ink">
                {/* Muted and playsInline: this is a live viewfinder, not media
                    with sound, and iOS otherwise takes it fullscreen. */}
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="size-full -scale-x-100 object-cover"
                />
              </div>
              <button
                type="button"
                onClick={capture}
                aria-label="Take photo"
                className="mx-auto mt-4 flex size-14 cursor-pointer items-center justify-center rounded-full border-4 border-hairline bg-paper transition-colors hover:border-primary"
              >
                <span className="size-10 rounded-full bg-primary" />
              </button>
            </div>
          ) : null}

          {shot ? (
            <div className="mt-4">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-cloud">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob, not something the image optimiser can sign */}
                <img src={shot.url} alt="Your captured photo" className="size-full object-cover" />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={retake}
                  className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-hairline text-sm font-medium text-ink transition-colors hover:bg-cloud"
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Video className="size-4" aria-hidden />
                  Use this photo
                </button>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
