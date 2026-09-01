"use client";

import { Mic, RotateCcw, Square, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useTwinRecorder, type TwinRecording } from "../hooks/use-twin-recorder";
import { CueCard, twinCues } from "./cue-card";

/** mm:ss, because a bare second count past a minute stops being readable. */
function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function DevicePicker({
  label,
  icon,
  devices,
  value,
  onChange,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  devices: readonly { deviceId: string; label: string }[];
  value: string | undefined;
  onChange: (id: string) => void;
  disabled: boolean;
}): ReactNode {
  if (devices.length === 0) return null;
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-hairline px-2.5 py-1.5">
      <span className="text-ink-soft" aria-hidden>
        {icon}
      </span>
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 truncate bg-transparent text-sm text-ink outline-none disabled:opacity-50"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Recording a twin from the webcam already in the machine.
 *
 * The microphone picker sits beside the camera picker rather than being
 * assumed, because the browser's default input is frequently not the one the
 * person is speaking into, and the meter beside it is the only way to know
 * that before spending a minute finding out.
 */
export function WebcamRecorder({
  name,
  onDone,
}: {
  name: string;
  onDone: (recording: TwinRecording) => void;
}): ReactNode {
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<string>();
  const [microphone, setMicrophone] = useState<string>();
  const recorder = useTwinRecorder(setError);
  const previewRef = useRef<HTMLVideoElement>(null);
  const cues = useMemo(() => twinCues(name), [name]);

  const { open, release, state, stream } = recorder;

  useEffect(() => {
    void open();
    return release;
  }, [open, release]);

  // Attached in an effect rather than via a prop: the element only exists once
  // permission has been granted and the preview has rendered.
  useEffect(() => {
    const element = previewRef.current;
    if (element && stream.current && element.srcObject !== stream.current) {
      element.srcObject = stream.current;
    }
  }, [state, stream]);

  const recording = state === "recording";
  const done = state === "done" && recorder.recording !== null;
  const tooShort = recorder.seconds < recorder.minSeconds;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-ink/90">
        {done && recorder.recording ? (
          <video
            key={recorder.recording.url}
            src={recorder.recording.url}
            controls
            playsInline
            className="aspect-video w-full"
          />
        ) : (
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            className="aspect-video w-full -scale-x-100 object-cover"
          />
        )}

        {recording ? (
          <p className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
            <span aria-live="off">{clock(recorder.seconds)}</span>
            <span className="text-white/60">/ {clock(recorder.maxSeconds)}</span>
          </p>
        ) : null}
      </div>

      {!done ? (
        <div className="flex flex-wrap items-center gap-2">
          <DevicePicker
            label="Camera"
            icon={<Video className="size-4" />}
            devices={recorder.cameras}
            value={camera}
            disabled={recording}
            onChange={(id) => {
              setCamera(id);
              void open(id, microphone);
            }}
          />
          <DevicePicker
            label="Microphone"
            icon={<Mic className="size-4" />}
            devices={recorder.microphones}
            value={microphone}
            disabled={recording}
            onChange={(id) => {
              setMicrophone(id);
              void open(camera, id);
            }}
          />
          {/* The one control that is not a control: proof the microphone is live. */}
          <div
            className="flex h-9 w-24 items-center gap-1 rounded-lg border border-hairline px-2"
            title="Microphone level"
          >
            <span className="sr-only">Microphone level</span>
            {Array.from({ length: 8 }, (_, bar) => (
              <span
                key={bar}
                aria-hidden
                className={
                  recorder.level * 8 > bar
                    ? "h-3 flex-1 rounded-full bg-primary"
                    : "h-1.5 flex-1 rounded-full bg-hairline"
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <CueCard cues={cues} seconds={recorder.seconds} recording={recording} />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {done ? (
          <>
            <button
              type="button"
              onClick={() => recorder.recording && onDone(recorder.recording)}
              disabled={tooShort}
              className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use this recording
            </button>
            <button
              type="button"
              onClick={recorder.reset}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <RotateCcw className="size-4" aria-hidden />
              Record again
            </button>
            {tooShort ? (
              <p className="text-sm text-ink-soft">
                That is {clock(recorder.seconds)}. A twin needs at least{" "}
                {clock(recorder.minSeconds)} to train on.
              </p>
            ) : null}
          </>
        ) : recording ? (
          <button
            type="button"
            onClick={recorder.stop}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Square className="size-4 fill-current" aria-hidden />
            Stop recording
          </button>
        ) : (
          <button
            type="button"
            onClick={recorder.start}
            disabled={state !== "ready"}
            className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "idle" ? "Waiting for camera" : "Start recording"}
          </button>
        )}
      </div>
    </div>
  );
}
