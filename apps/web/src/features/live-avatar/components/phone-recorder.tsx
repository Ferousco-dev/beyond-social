"use client";

import { createClient } from "@supabase/supabase-js";
import { useState, type ReactNode } from "react";

import { env } from "@/lib/env";

import { type TwinRecording } from "../hooks/use-twin-recorder";
import { WebcamRecorder } from "./webcam-recorder";

/**
 * Recording a twin on the phone that scanned the link.
 *
 * The same recorder as the desktop, on purpose: the prompts, the length bounds
 * and the microphone check are properties of what makes usable training
 * footage, not of the device holding the camera. A second implementation here
 * would be a second set of bugs and a second definition of "long enough".
 *
 * The upload goes straight from this page to storage with a ticket the server
 * issued. A minute of 1080p video is tens of megabytes, and posting that
 * through a serverless function would fail on body size long before it failed
 * on anything worth debugging.
 */

type Phase = "recording" | "uploading" | "done" | "failed";

export function PhoneRecorder({ token }: { token: string }): ReactNode {
  const [phase, setPhase] = useState<Phase>("recording");
  const [message, setMessage] = useState<string | null>(null);

  const upload = async (recording: TwinRecording): Promise<void> => {
    setPhase("uploading");
    setMessage(null);
    try {
      const ticketed = await fetch(`/api/avatar/handoff/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: recording.mimeType }),
      });
      if (!ticketed.ok) throw new Error("This link is no longer good.");
      const ticket = (await ticketed.json()) as { path: string; token: string };

      // The anon client is only a transport here: the ticket is the authority,
      // and it was issued against a token this device proved it holds.
      const storage = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { error } = await storage.storage
        .from("uploads")
        .uploadToSignedUrl(ticket.path, ticket.token, recording.blob, {
          contentType: recording.mimeType,
        });
      if (error) throw new Error(error.message);

      const claimed = await fetch(`/api/avatar/handoff/${token}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: ticket.path }),
      });
      if (!claimed.ok) throw new Error("This link had already been used.");

      setPhase("done");
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "That upload did not finish.");
    }
  };

  if (phase === "done") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-ink">Sent</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your recording is on its way. You can put the phone down and carry on where you started.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <header className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Record your avatar</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hold the phone at eye level in even light. This is the footage every video of you will be
          made from.
        </p>
      </header>

      <div className="mt-6">
        {/*
         * No name to read: this device has no session, and asking the phone who
         * it belongs to would be asking the one party that cannot be trusted to
         * answer. The consent line opens neutrally instead.
         */}
        <WebcamRecorder name="" onDone={(recording) => void upload(recording)} />
      </div>

      {phase === "uploading" ? (
        <p role="status" className="mt-4 text-center text-sm text-ink-soft">
          Sending your recording. Keep this page open.
        </p>
      ) : null}
      {phase === "failed" && message ? (
        <p role="alert" className="mt-4 text-center text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </main>
  );
}
