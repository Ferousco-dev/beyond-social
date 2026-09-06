"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Camera and microphone capture for a digital twin's training clip.
 *
 * A sibling of `useVoiceRecorder` rather than a replacement: that one captures
 * audio alone through an AudioWorklet because it needs WAV, and this one needs
 * a single file with both tracks in sync, which is what `MediaRecorder` is for.
 *
 * The distinction that matters is with `live-capture-dialog`, which opens the
 * camera with `audio: false` and ships one still frame. That is not a bug, it
 * is honest about the model behind it: `kling/ai-avatar-pro` takes a photo and
 * a separate voice clip, so a microphone track would have been captured and
 * then thrown away. A digital twin is the opposite: the whole point is footage
 * of somebody moving and speaking, so the audio is half the recording.
 */

/** HeyGen trains from 15 seconds upward; below that there is not enough to learn. */
export const MIN_SECONDS = 20;

/**
 * Two minutes is HeyGen's upper bound for twin footage, and long past the point
 * where a person reading three prompted lines has given the model what it needs.
 */
export const MAX_SECONDS = 120;

export type TwinRecorderState = "idle" | "ready" | "recording" | "done";

export interface MediaDeviceChoice {
  readonly deviceId: string;
  readonly label: string;
}

export interface TwinRecording {
  readonly blob: Blob;
  readonly url: string;
  readonly seconds: number;
  readonly mimeType: string;
}

/**
 * The best container this browser will actually produce.
 *
 * Ordered by what the training provider prefers rather than by what is most
 * common: MP4 is accepted everywhere and is what Safari emits natively, and the
 * VP9/VP8 fallbacks are for Chrome and Firefox, which do not all offer MP4 from
 * `MediaRecorder`. Codecs are named explicitly because the bare mime type is
 * reported as supported by browsers that then produce a file with no audio.
 */
function pickMimeType(): string {
  const candidates = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function useTwinRecorder(onError: (message: string) => void) {
  const [state, setState] = useState<TwinRecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  /** 0..1, so a microphone that is muted or dead is visible before recording. */
  const [level, setLevel] = useState(0);
  const [cameras, setCameras] = useState<readonly MediaDeviceChoice[]>([]);
  const [microphones, setMicrophones] = useState<readonly MediaDeviceChoice[]>([]);
  const [recording, setRecording] = useState<TwinRecording | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  /**
   * Mirrors `seconds` for `onstop` to read.
   *
   * `onstop` is assigned once, inside this single call to `start`, and closes
   * over whatever `seconds` was at that moment: 0, always, since recording has
   * not begun yet. The ticking interval below only ever reaches the component
   * through `setSeconds`, which `onstop` cannot see. A ref updated alongside
   * the same state is what a callback assigned once and fired later needs to
   * read the count as it stood when the recording actually stopped.
   */
  const secondsRef = useRef(0);

  const stopMeter = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    setLevel(0);
  }, []);

  /**
   * Drives the level meter from the live microphone track.
   *
   * Worth the few lines because it answers, before somebody records two minutes
   * of themselves, the one question a preview cannot: whether the microphone
   * this browser picked is the one making sound.
   */
  const startMeter = useCallback((stream: MediaStream) => {
    // Safari still exposes only the prefixed constructor on some versions, and
    // the meter is a nicety: no AudioContext means no meter, never no recording.
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx || stream.getAudioTracks().length === 0) return;
    const context = new Ctx();
    audioRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Uint8Array(analyser.frequencyBinCount);

    const read = (): void => {
      analyser.getByteTimeDomainData(buffer);
      let peak = 0;
      for (const sample of buffer) peak = Math.max(peak, Math.abs(sample - 128) / 128);
      setLevel(peak);
      rafRef.current = requestAnimationFrame(read);
    };
    read();
  }, []);

  const release = useCallback(() => {
    stopMeter();
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, [stopMeter]);

  /** Opens both devices. Audio is not optional here; without it there is no twin. */
  const open = useCallback(
    async (cameraId?: string, microphoneId?: string): Promise<void> => {
      release();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraId
            ? { deviceId: { exact: cameraId } }
            : {
                facingMode: "user",
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 },
              },
          audio: microphoneId
            ? { deviceId: { exact: microphoneId } }
            : { echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        startMeter(stream);
        setState("ready");

        // Labels are empty until permission is granted, so both pickers are
        // filled after the first successful open rather than before it.
        const list = await navigator.mediaDevices.enumerateDevices();
        const named = (kind: MediaDeviceKind, fallback: string): MediaDeviceChoice[] =>
          list
            .filter((device) => device.kind === kind)
            .map((device, index) => ({
              deviceId: device.deviceId,
              label: device.label || `${fallback} ${index + 1}`,
            }));
        setCameras(named("videoinput", "Camera"));
        setMicrophones(named("audioinput", "Microphone"));
      } catch (error) {
        const denied = error instanceof DOMException && error.name === "NotAllowedError";
        onError(
          denied
            ? "Camera and microphone access was blocked. Allow both in your browser to record."
            : "That camera or microphone could not be opened.",
        );
        setState("idle");
      }
    },
    [onError, release, startMeter],
  );

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    if (stream.getAudioTracks().length === 0) {
      onError("No microphone track is active, so the recording would be silent.");
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      tickRef.current = null;
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      setRecording((previous) => {
        if (previous) URL.revokeObjectURL(previous.url);
        return {
          blob,
          url: URL.createObjectURL(blob),
          seconds: secondsRef.current,
          mimeType: type,
        };
      });
      setState("done");
    };

    secondsRef.current = 0;
    setSeconds(0);
    setState("recording");
    // A timeslice means a long recording is not held as one growing buffer, and
    // a crash partway through still leaves the chunks already delivered.
    recorder.start(1000);
    tickRef.current = window.setInterval(() => {
      setSeconds((value) => {
        const next = value + 1;
        secondsRef.current = next;
        if (next >= MAX_SECONDS) stop();
        return next;
      });
    }, 1000);
  }, [onError, stop]);

  const reset = useCallback(() => {
    setRecording((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });
    setSeconds(0);
    setState(streamRef.current ? "ready" : "idle");
  }, []);

  useEffect(() => release, [release]);

  return {
    state,
    seconds,
    level,
    cameras,
    microphones,
    recording,
    stream: streamRef,
    open,
    start,
    stop,
    reset,
    release,
    minSeconds: MIN_SECONDS,
    maxSeconds: MAX_SECONDS,
  };
}
