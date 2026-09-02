"use client";

import { Mic, Square } from "lucide-react";

import { useVoiceRecorder } from "../hooks/use-voice-recorder";
import { useVoiceUpload, type PendingVoice } from "../hooks/use-voice-upload";
import { Spinner } from "@/components/ui/spinner";

/**
 * Recording a clip from the composer.
 *
 * Sits next to send because recording the line you want spoken is the common
 * path, and burying it in the attachment menu would put two taps and a file
 * picker in front of the thing most people came to do. Enrolling a voice to
 * reuse is a different, longer flow and belongs in settings.
 *
 * The recording is uploaded the moment it stops, on the same path as a clip
 * picked from the device, and appears as the same chip.
 */
export function RecordButton({
  projectId,
  onVoice,
  onError,
  onBusyChange,
}: {
  projectId: string;
  onVoice: (voice: PendingVoice) => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { upload, uploading } = useVoiceUpload({ projectId, onVoice, onError, onBusyChange });
  const { state, seconds, level, start, stop, maxSeconds } = useVoiceRecorder(onError);

  const recording = state === "recording";
  const busy = state === "encoding" || uploading;

  async function toggle() {
    if (recording) {
      const result = await stop();
      if (result) upload(result.file);
      return;
    }
    await start();
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      // The label carries the state because the icon alone does not: a square
      // means nothing without knowing a recording is in progress.
      aria-label={recording ? `Stop recording, ${seconds} seconds` : "Record your voice"}
      className={
        recording
          ? "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-destructive px-3 text-paper transition-opacity hover:opacity-90"
          : "inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {busy ? (
        <Spinner className="size-4" />
      ) : recording ? (
        <>
          <Square className="size-3.5 fill-current" aria-hidden />
          {/* Four bars driven by the live input level, so it is obvious the
              microphone is hearing something rather than merely running. The
              thresholds are staggered so quiet speech still moves the first
              bar and only shouting fills all four. */}
          <span aria-hidden className="flex items-end gap-0.5">
            {[0.08, 0.25, 0.5, 0.75].map((threshold) => (
              <span
                key={threshold}
                className="w-0.5 rounded-full bg-current transition-all duration-100"
                style={{ height: level > threshold ? "0.875rem" : "0.25rem" }}
              />
            ))}
          </span>
          {/* Counts up rather than down: there is no deadline to dread, and the
              cap exists to stop a forgotten recording, not to hurry anyone. */}
          <span className="text-xs tabular-nums">
            {seconds}s{seconds > maxSeconds - 10 ? ` / ${maxSeconds}s` : ""}
          </span>
        </>
      ) : (
        <Mic className="size-4" aria-hidden />
      )}
    </button>
  );
}
