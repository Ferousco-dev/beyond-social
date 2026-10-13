"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 180;

/** Records a voice note with the microphone and hands it back as a file. */
export function useVoiceRecorder(onRecorded: (file: File) => void): {
  readonly supported: boolean;
  readonly recording: boolean;
  readonly seconds: number;
  readonly error: string | null;
  readonly start: () => Promise<void>;
  readonly stop: () => void;
} {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const callback = useRef(onRecorded);
  useEffect(() => {
    callback.current = onRecorded;
  });

  const supported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices;

  const stop = useCallback(() => {
    clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const instance = new MediaRecorder(stream);
      recorder.current = instance;
      instance.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
      instance.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const type = (instance.mimeType || "audio/webm").split(";")[0] ?? "audio/webm";
        if (chunks.length > 0) {
          callback.current(new File(chunks, `voice-note.${type.includes("mp4") ? "m4a" : "weba"}`, { type }));
        }
      };
      instance.start();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("The microphone is not available. Allow access and try again.");
    }
  }, [stop]);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    [],
  );

  return { supported, recording, seconds, error, start, stop };
}
