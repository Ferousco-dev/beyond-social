"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, ChevronDown, Loader2, RotateCcw, Square, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Recording yourself, live, for a talking-avatar render.
 *
 * A photo plus a voice clip already makes an avatar render, whether attached
 * in the composer or the dashboard home screen; this is a way to get that
 * photo by actually recording, rather than staging a still shot. It records a
 * real video clip, with a device picker for anyone using an external camera,
 * and the reviewer plays it back like a video because that is what it is.
 *
 * What ships downstream is still a single frame, not the clip: the active
 * avatar model (`kling/ai-avatar-pro`) takes a photo and an audio track, not a
 * driving video, and the recorded clip's own container (WebM, from
 * `MediaRecorder`) is not one of the two formats the footage pipeline accepts
 * either (see `use-footage-upload.ts`). A frame grabbed at the moment
 * recording stops is the honest bridge between "record a video" and what the
 * generation pipeline can actually use today; a real recorded-video avatar is
 * the separate, larger HeyGen-based feature tracked in
 * docs/live-avatar/DESIGN.md, not something this dialog quietly pretends to
 * already do.
 */

type Stage = "intro" | "loading" | "preview" | "denied" | "error" | "review";

/** Long enough to say a full line, short enough that nobody rambles into it. */
const MAX_SECONDS = 20;

interface CameraDevice {
  readonly deviceId: string;
  readonly label: string;
}

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
  const [devices, setDevices] = useState<readonly CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [shot, setShot] = useState<{ blob: Blob; videoUrl: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopTicker = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const openCamera = useCallback(async (forDeviceId?: string) => {
    setStage("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: forDeviceId
          ? { deviceId: { exact: forDeviceId } }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("preview");

      // Device labels are empty until permission is granted, so the picker is
      // populated here, on the first successful open, rather than up front.
      const list = await navigator.mediaDevices.enumerateDevices();
      const cameras = list
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({ deviceId: d.deviceId, label: d.label || `Camera ${index + 1}` }));
      setDevices(cameras);
      const active = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (active) setDeviceId(active);
    } catch (error) {
      setStage(
        error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error",
      );
    }
  }, []);

  const switchCamera = useCallback(
    (nextId: string) => {
      stopStream();
      setDeviceId(nextId);
      void openCamera(nextId);
    },
    [openCamera, stopStream],
  );

  // The <video> element only exists once stage is "preview", so the stream is
  // attached here, after that state has actually committed, rather than from
  // inside openCamera itself where the ref would still be null on first open.
  useEffect(() => {
    if (stage === "preview" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  useEffect(() => {
    if (stage === "review" && reviewRef.current && shot) {
      reviewRef.current.src = shot.videoUrl;
    }
  }, [stage, shot]);

  useEffect(() => {
    if (!open) {
      stopTicker();
      stopStream();
      recorderRef.current = null;
      setStage("intro");
      setRecording(false);
      setSeconds(0);
      setDevices([]);
      setDeviceId(null);
      setShot((current) => {
        if (current) URL.revokeObjectURL(current.videoUrl);
        return null;
      });
    }
    return () => {
      stopTicker();
      stopStream();
    };
  }, [open, stopStream, stopTicker]);

  function startRecording() {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const clip = new Blob(chunksRef.current, { type: "video/webm" });
      setShot({ blob: clip, videoUrl: URL.createObjectURL(clip) });
      setStage("review");
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    setSeconds(0);

    const startedAt = Date.now();
    tickRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) stopRecording();
    }, 250);
  }

  function stopRecording() {
    stopTicker();
    setRecording(false);
    recorderRef.current?.stop();
  }

  function retake() {
    setShot((current) => {
      if (current) URL.revokeObjectURL(current.videoUrl);
      return null;
    });
    void openCamera(deviceId ?? undefined);
  }

  function confirm() {
    // Grabbed from whatever frame the review player is currently showing,
    // which is why the reviewer has scrub controls rather than being a fixed
    // still: it lets a mid-recording blink or a bad frame be avoided without
    // recording the whole clip again.
    const source = reviewRef.current;
    if (!source) return;

    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth || 720;
    canvas.height = source.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], "live-capture.jpg", { type: "image/jpeg" }));
        onOpenChange(false);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <Dialog.Title className="text-sm font-semibold text-ink">Record yourself</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="inline-flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="p-5">
            {stage === "intro" ? (
              <div>
                <p className="text-sm leading-relaxed text-ink-soft">
                  Record yourself saying a line, then pair it with your voice. Your photo speaks it,
                  no editing required.
                </p>
                <ol className="mt-4 space-y-2 border-t border-hairline pt-4 text-sm text-ink-soft">
                  <li className="flex gap-2.5">
                    <span className="text-ink-soft/60 tabular-nums">01</span>
                    Face the camera, well lit
                  </li>
                  <li className="flex gap-2.5">
                    <span className="text-ink-soft/60 tabular-nums">02</span>
                    Record a few seconds
                  </li>
                  <li className="flex gap-2.5">
                    <span className="text-ink-soft/60 tabular-nums">03</span>
                    Describe the video and send
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={() => void openCamera()}
                  className="mt-5 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-paper transition-opacity hover:opacity-90"
                >
                  <Video className="size-4" aria-hidden />
                  Open camera
                </button>
              </div>
            ) : null}

            {stage === "loading" ? (
              <div className="flex aspect-square items-center justify-center rounded-xl bg-cloud">
                <Loader2 className="size-5 animate-spin text-ink-soft" aria-hidden />
              </div>
            ) : null}

            {stage === "denied" || stage === "error" ? (
              <div>
                <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm leading-relaxed text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {stage === "denied"
                    ? "Camera access was blocked. Allow it in your browser's site settings, then try again."
                    : "Could not reach a camera on this device."}
                </div>
                <button
                  type="button"
                  onClick={() => void openCamera()}
                  className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-full border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {stage === "preview" ? (
              <div>
                <div className="relative aspect-square overflow-hidden rounded-xl bg-ink">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="size-full -scale-x-100 object-cover"
                  />
                  {recording ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
                      <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
                      {seconds}s
                    </span>
                  ) : null}
                </div>

                {devices.length > 1 ? (
                  <div className="relative mt-3">
                    <select
                      value={deviceId ?? ""}
                      onChange={(event) => switchCamera(event.target.value)}
                      disabled={recording}
                      className="w-full appearance-none rounded-lg border border-hairline bg-paper py-2 pl-3 pr-8 text-xs text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                    >
                      {devices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-soft"
                      aria-hidden
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={
                    recording
                      ? "mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-destructive text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
                      : "mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  }
                >
                  {recording ? (
                    <>
                      <Square className="size-3.5 fill-current" aria-hidden />
                      Stop recording
                    </>
                  ) : (
                    <>
                      <span aria-hidden className="size-2.5 rounded-full bg-current" />
                      Start recording
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {stage === "review" && shot ? (
              <div>
                <div className="relative aspect-square overflow-hidden rounded-xl bg-ink">
                  <video
                    ref={reviewRef}
                    controls
                    playsInline
                    className="size-full -scale-x-100 object-cover"
                  />
                </div>
                <div className="mt-3 flex gap-2">
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
                    Use this
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
