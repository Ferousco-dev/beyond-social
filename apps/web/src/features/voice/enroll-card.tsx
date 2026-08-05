"use client";

import { Loader2, Mic, Pause, Play, Trash2 } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";

import { useVoiceRecorder } from "@/features/dashboard/hooks/use-voice-recorder";
import { useVoiceUpload } from "@/features/dashboard/hooks/use-voice-upload";

import { deleteVoiceProfile, enrollVoice, type VoiceProfile } from "./actions";

interface Props {
  initial: VoiceProfile | null;
}

export function EnrollCard({ initial }: Props) {
  const [profile, setProfile] = useState<VoiceProfile | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, startEnroll] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recorder = useVoiceRecorder(setError);
  const uploader = useVoiceUpload({
    projectId: "voice-enroll",
    onVoice: (pending) => {
      startEnroll(async () => {
        const result = await enrollVoice({
          path: pending.path,
          phrase: "Voice enrollment sample",
        });
        if (result.status === "ok") {
          setProfile(result.profile);
          setError(null);
        } else if (result.status !== "unconfigured") {
          setError(result.message);
        }
      });
    },
    onError: setError,
    onBusyChange: () => {},
  });

  const handleRecord = useCallback(async () => {
    if (recorder.state === "idle") {
      await recorder.start();
    } else if (recorder.state === "recording") {
      const recording = await recorder.stop();
      if (recording) {
        uploader.upload(recording.file);
      }
    }
  }, [recorder, uploader]);

  const handleDelete = useCallback(() => {
    startDelete(async () => {
      const result = await deleteVoiceProfile();
      if (result.status === "ok") {
        setProfile(null);
        setPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      } else if (result.status !== "unconfigured") {
        setError(result.message);
      }
    });
  }, []);

  const togglePlay = useCallback(() => {
    if (!profile?.url) return;
    if (!audioRef.current) {
      const audio = new Audio(profile.url);
      audio.addEventListener("ended", () => setPlaying(false));
      audioRef.current = audio;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  }, [profile?.url, playing]);

  const busy = enrolling || deleting || uploader.uploading || recorder.state !== "idle";

  if (profile) {
    return (
      <div className="rounded-2xl border border-hairline bg-paper p-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <Mic className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-ink">Your saved voice</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Type what you want said and your saved voice will speak it. Re-record to replace it.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!profile.url}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-50"
              >
                {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {playing ? "Pause" : "Preview"}
              </button>
              <button
                type="button"
                onClick={() => void handleRecord()}
                disabled={busy}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-50"
              >
                <Mic className="size-3.5" />
                Re-record
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Mic className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-ink">Save your voice</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Record a short clip of yourself speaking. Once saved, type what you want said
            instead of recording each time.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void handleRecord()}
              disabled={busy}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : recorder.state === "recording" ? (
                <>
                  <span className="size-2 animate-pulse rounded-full bg-destructive" />
                  Stop recording ({recorder.seconds}s)
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  Record voice sample
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
