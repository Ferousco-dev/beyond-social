"use client";

import { Check, Mic, Pause, Play, Trash2 } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";

import { useConfirm } from "@/components/ui/use-confirm";
import { useVoiceRecorder } from "@/features/dashboard/hooks/use-voice-recorder";
import { useVoiceUpload } from "@/features/dashboard/hooks/use-voice-upload";
import { PHRASE_SECONDS } from "@/lib/voice/phrase";

import { deleteVoiceProfile, enrollVoice, type VoiceProfile } from "./actions";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  initial: VoiceProfile | null;
  /** The exact wording to read, and the wording stored with the recording. */
  phrase: string;
}

export function EnrollCard({ initial, phrase }: Props) {
  const [profile, setProfile] = useState<VoiceProfile | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, startEnroll] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { confirm, dialog } = useConfirm();
  const recorder = useVoiceRecorder(setError);
  const uploader = useVoiceUpload({
    projectId: "voice-enroll",
    onVoice: (pending) => {
      startEnroll(async () => {
        // The wording that was on screen, not a placeholder. This column exists
        // so a later dispute can be checked against what was actually asked.
        const result = await enrollVoice({ path: pending.path, phrase });
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

  const handleDelete = useCallback(async () => {
    /*
     * Asked for, because this one cannot be undone by re-recording. The clip is
     * a voiceprint: deleting it discards the enrolment and the consent record
     * that went with it, and the replacement is a new recording rather than the
     * one that was there.
     */
    const agreed = await confirm({
      title: "Delete your saved voice?",
      description:
        "The recording and the agreement stored with it are removed for good. Your videos stop being able to speak in your voice until you record again.",
      confirmLabel: "Delete it",
      tone: "destructive",
    });
    if (!agreed) return;

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
  }, [confirm]);

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
      <div className="h-full rounded-2xl border border-hairline bg-paper p-6">
        {dialog}
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <Mic className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Your saved voice</h2>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Check className="size-2.5" aria-hidden />
                Saved
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
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
                onClick={() => void handleDelete()}
                disabled={busy}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleting ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
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
    <div className="rounded-xl border border-hairline bg-paper p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Mic className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Save your voice</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Read the line below out loud, once. After that you can type what you want said instead
            of recording every time.
          </p>

          {/* The script is on screen rather than left to the user to invent.
              A clip of somebody saying "testing, testing" is a worse sample and
              a worse record: this names them and states what it is for, in
              their own voice. */}
          <blockquote className="mt-3 rounded-xl bg-cloud px-4 py-3 text-sm leading-relaxed text-ink">
            {phrase}
          </blockquote>
          <p className="mt-2 text-xs text-ink-soft">
            About {PHRASE_SECONDS} seconds. Somewhere quiet, at your normal speaking pace.
          </p>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => void handleRecord()}
              disabled={busy}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? (
                <Spinner className="size-4" />
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
