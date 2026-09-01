"use client";

import { useRef, useState, type ReactNode } from "react";

import { type TwinRecording } from "../hooks/use-twin-recorder";
import { PhoneHandoff } from "./phone-handoff";
import { WebcamRecorder } from "./webcam-recorder";

/**
 * The one screen that turns a person into a reusable avatar.
 *
 * Three routes to the same place, because the useful footage is wherever the
 * person already is: the webcam in front of them, the better camera in their
 * pocket, or a clip they have already shot. They are peers rather than a
 * primary and two fallbacks, which is why the two live ones are a segmented
 * control and the third sits in the sentence above it.
 *
 * Nothing here calls a provider. It produces one file plus the consent that
 * came with it; training is a separate step behind its own guard, and keeping
 * that boundary is what lets this screen be finished and useful before any
 * HeyGen credentials exist.
 */

type Route = "webcam" | "phone";

/** What a completed capture hands back, whatever route produced it. */
export interface TwinFootage {
  readonly file: File;
  readonly seconds: number | null;
  readonly source: Route | "upload";
}

const ACCEPTED = "video/mp4,video/quicktime,video/webm";

/** HeyGen's own ceiling for twin footage; anything longer is trimmed anyway. */
const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

export function CreateTwinScreen({
  name,
  onFootage,
  phone,
}: {
  name: string;
  onFootage: (footage: TwinFootage) => void;
  /**
   * The phone handoff, when one has been minted. Absent is a real state, not a
   * missing prop: the route ships before the token endpoint behind it does.
   */
  phone?: { url: string | null; expiresAt: number | null; onRefresh: () => void };
}): ReactNode {
  const [route, setRoute] = useState<Route>("webcam");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const takeRecording = (recording: TwinRecording): void => {
    const extension = recording.mimeType.includes("mp4") ? "mp4" : "webm";
    onFootage({
      file: new File([recording.blob], `twin-recording.${extension}`, {
        type: recording.mimeType,
      }),
      seconds: recording.seconds,
      source: "webcam",
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Create your avatar
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Record yourself once, then reuse it for every video you make. Or{" "}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer text-primary underline underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            upload footage
          </button>
          .
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > MAX_UPLOAD_BYTES) {
              setUploadError("That file is larger than 512MB. Trim it and try again.");
              return;
            }
            setUploadError(null);
            onFootage({ file, seconds: null, source: "upload" });
          }}
        />
      </header>

      <div
        role="tablist"
        aria-label="How to record"
        className="mx-auto mt-6 grid w-full max-w-md grid-cols-2 rounded-full bg-cloud p-1"
      >
        {(
          [
            ["webcam", "Record via webcam"],
            ["phone", "Record via phone"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={route === value}
            onClick={() => setRoute(value)}
            className={
              route === value
                ? "cursor-pointer rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink shadow-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                : "cursor-pointer rounded-full px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {uploadError ? (
        <p role="alert" className="mt-4 text-center text-sm text-destructive">
          {uploadError}
        </p>
      ) : null}

      <div className="mt-6">
        {route === "webcam" ? (
          <WebcamRecorder name={name} onDone={takeRecording} />
        ) : (
          <PhoneHandoff
            url={phone?.url ?? null}
            expiresAt={phone?.expiresAt ?? null}
            onRefresh={phone?.onRefresh ?? (() => undefined)}
          />
        )}
      </div>
    </div>
  );
}
