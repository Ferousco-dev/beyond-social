"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { concatChunks, downsample, encodeWav, TARGET_SAMPLE_RATE } from "@/lib/audio/wav";

/**
 * Recording a voice clip in the browser.
 *
 * Capture goes through an AudioWorklet rather than `MediaRecorder`, which would
 * be less code but produces WebM/Opus almost everywhere, and the video provider
 * refuses WebM. Taking the raw samples means we encode WAV ourselves and get a
 * file the provider will actually accept.
 *
 * The worklet is loaded from a blob URL. A separate file would have to be
 * served as a static asset, which means build configuration for one small
 * script; inlining keeps it beside the code that uses it.
 */

/** Long enough for a sentence, short enough that a forgotten recording is harmless. */
const MAX_SECONDS = 60;

/**
 * Served as a static file rather than inlined as a blob url: the content
 * security policy allows scripts from 'self' only, and widening script-src to
 * include blob: for one small script would loosen what the whole app may run.
 */
const PROCESSOR_URL = "/audio/capture-worklet.js";

export type RecorderState = "idle" | "recording" | "encoding";

interface Recording {
  readonly file: File;
  readonly seconds: number;
}

export function useVoiceRecorder(onError: (message: string) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  /** Loudness of the latest samples, 0 to 1, for showing that input is arriving. */
  const [level, setLevel] = useState(0);

  const chunks = useRef<Float32Array[]>([]);
  const context = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const worklet = useRef<AudioWorkletNode | null>(null);
  const ticker = useRef<number | null>(null);
  // Sampled on the timer rather than set on every message: the worklet delivers
  // roughly 375 buffers a second, and re-rendering at that rate to move a bar a
  // few pixels would cost far more than it shows.
  const peak = useRef(0);

  /** Releases the microphone and everything holding it. Safe to call twice. */
  const teardown = useCallback(() => {
    if (ticker.current !== null) {
      window.clearInterval(ticker.current);
      ticker.current = null;
    }
    worklet.current?.disconnect();
    worklet.current = null;
    // The track has to be stopped explicitly, or the browser keeps showing the
    // recording indicator after the UI says it has finished.
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void context.current?.close();
    context.current = null;
  }, []);

  // A component unmounting mid-recording must not leave the microphone open.
  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        // Speech, not music: the browser's own cleanup is worth more here than
        // fidelity, and it makes the transcription that follows more reliable.
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      stream.current = media;

      const audio = new AudioContext();
      context.current = audio;

      await audio.audioWorklet.addModule(PROCESSOR_URL);

      chunks.current = [];
      const node = new AudioWorkletNode(audio, "capture");
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        chunks.current.push(event.data);
        peak.current = Math.max(peak.current, ...event.data.map(Math.abs));
      };
      audio.createMediaStreamSource(media).connect(node);
      // Connected to the destination because some browsers will not run a
      // worklet that has no downstream node. The worklet emits nothing, so
      // nothing is played back and there is no feedback loop.
      node.connect(audio.destination);
      worklet.current = node;

      setSeconds(0);
      setLevel(0);
      setState("recording");

      const startedAt = Date.now();
      ticker.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setSeconds(elapsed);
        // Scaled up because speech rarely approaches full scale, so a raw peak
        // would leave the meter looking dead during normal talking.
        setLevel(Math.min(1, peak.current * 3));
        peak.current = 0;
        if (elapsed >= MAX_SECONDS) stopRef.current?.();
      }, 250);
    } catch (error) {
      teardown();
      setState("idle");
      /*
       * A denial and a policy block raise the same NotAllowedError, and telling
       * someone to allow a microphone the page forbids sends them to fiddle
       * with browser settings that cannot help. When the page itself is the one
       * refusing, the permissions api still reports the permission as grantable,
       * so the two can be told apart and named correctly.
       */
      const notAllowed = error instanceof DOMException && error.name === "NotAllowedError";
      let message = "Could not start recording on this device.";
      if (notAllowed) {
        message = "Microphone access is blocked. Allow it in your browser to record.";
        try {
          const status = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          if (status.state !== "denied") {
            message = "Recording is not available on this page.";
          }
        } catch {
          // Firefox does not expose the microphone permission here, so the
          // denial wording stands as the likelier of the two.
        }
      }
      onError(message);
    }
  }, [state, teardown, onError]);

  const stop = useCallback(async (): Promise<Recording | null> => {
    if (state !== "recording") return null;
    setState("encoding");

    const rate = context.current?.sampleRate ?? TARGET_SAMPLE_RATE;
    const collected = chunks.current;
    chunks.current = [];
    teardown();

    const merged = concatChunks(collected);
    if (merged.length === 0) {
      setState("idle");
      onError("That recording was empty. Try again.");
      return null;
    }

    const blob = encodeWav(downsample(merged, rate));
    setState("idle");
    return {
      file: new File([blob], "voice.wav", { type: "audio/wav" }),
      seconds: Math.round(merged.length / rate),
    };
  }, [state, teardown, onError]);

  // The timer needs to stop the recording when it runs long, but `stop` is
  // defined after it. A ref keeps the current one reachable without making the
  // two callbacks depend on each other.
  const stopRef = useRef<(() => void) | null>(null);
  stopRef.current = () => void stop();

  return { state, seconds, level, start, stop, maxSeconds: MAX_SECONDS };
}
