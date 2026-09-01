"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { env } from "@/lib/env";

import { mintHandoff } from "../handoff-actions";
import { startTwinTraining, ticketTwinFootage, twinStatus } from "../upload-actions";
import { CreateTwinScreen, type TwinFootage } from "./create-twin-screen";
import { TwinStatusPanel, type Phase } from "./twin-status-panel";

/**
 * The client half of the Live entry point: what happens to a recording once it
 * exists, wherever it came from.
 *
 * Both routes end in the same two calls, upload then train, because a twin is a
 * twin whether the camera was in the laptop or in the hand. The phone cannot
 * make the second call itself, having no session, so it uploads and this side
 * notices and finishes the job.
 */

/** Fast enough to feel immediate, slow enough not to hammer while nothing changes. */
const POLL_MS = 4000;

export function CreateTwinEntry({ name }: { name: string }): ReactNode {
  const [phase, setPhase] = useState<Phase>("recording");
  const [message, setMessage] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<{ url: string | null; expiresAt: number | null }>({
    url: null,
    expiresAt: null,
  });

  // Guards the phone pickup: without it, two polls four seconds apart both see
  // the same claimed handoff and start training on it twice.
  const claiming = useRef(false);

  const refresh = useCallback(async () => {
    const result = await mintHandoff();
    setHandoff(
      result.status === "ok"
        ? { url: result.url, expiresAt: result.expiresAt }
        : { url: null, expiresAt: null },
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const train = useCallback(async (path: string) => {
    setPhase("training");
    const started = await startTwinTraining(path);
    if (started.status === "error") {
      setMessage(started.message);
      setPhase("failed");
      return;
    }
    setMessage(null);
    setPhase(started.training === "failed" ? "failed" : "training");
  }, []);

  /** Uploads a local recording, then trains from it. */
  const submit = useCallback(
    async (footage: TwinFootage) => {
      setPhase("uploading");
      setMessage(null);
      try {
        const ticketed = await ticketTwinFootage(footage.file.type);
        if (ticketed.status === "error") throw new Error(ticketed.message);

        const storage = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        );
        const { error } = await storage.storage
          .from("uploads")
          .uploadToSignedUrl(ticketed.ticket.path, ticketed.ticket.token, footage.file, {
            contentType: footage.file.type,
          });
        if (error) throw new Error(error.message);

        await train(ticketed.ticket.path);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "That upload did not finish.");
        setPhase("failed");
      }
    },
    [train],
  );

  /*
   * Watches for two things at once: a phone finishing, and training finishing.
   *
   * Polled rather than pushed because neither event has a channel to arrive on:
   * the phone talks to the server, not to this page, and HeyGen answers a poll
   * rather than calling back for training.
   */
  useEffect(() => {
    if (phase === "ready" || phase === "failed") return;
    let live = true;

    const tick = async (): Promise<void> => {
      const status = await twinStatus();
      if (!live) return;

      if (status.training === "ready") {
        setPhase("ready");
        return;
      }
      if (status.training === "failed") {
        setMessage(status.error);
        setPhase("failed");
        return;
      }
      if (status.training === "pending" && phase === "recording") setPhase("training");

      // A claimed handoff means the phone has sent something and is waiting for
      // this side to turn it into a twin.
      if (status.handoffPath && status.training === null && !claiming.current) {
        claiming.current = true;
        await train(status.handoffPath);
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [phase, train]);

  if (phase !== "recording") {
    return (
      <TwinStatusPanel
        phase={phase}
        message={message}
        onRetry={() => {
          claiming.current = false;
          setMessage(null);
          setPhase("recording");
        }}
      />
    );
  }

  return (
    <CreateTwinScreen
      name={name}
      onFootage={(footage) => void submit(footage)}
      phone={{ ...handoff, onRefresh: () => void refresh() }}
    />
  );
}
