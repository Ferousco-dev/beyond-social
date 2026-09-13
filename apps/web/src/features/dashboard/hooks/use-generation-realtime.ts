"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Render status, pushed rather than asked for.
 *
 * A draft's state changes in a database, minutes after the turn that started
 * it: `kie-callback` writes `ready` (or `failed`) whenever the render lands,
 * whether or not the browser that asked for it is still open. Until now that
 * change reached the screen only through the client's own 3-second poll, which
 * dies with the tab and restarts on every reload.
 *
 * Subscribing to `video_generations` closes that gap. Delivery is scoped by
 * row level security, the same policy the thread reads through, so a session
 * hears only its own rows; nothing here filters by user id because the
 * database has already done it. The poll keeps running as the fallback for
 * browsers where the realtime socket cannot be held open, which is why both
 * paths settle through the same idempotent writer in the thread.
 *
 * An UPDATE event carries the whole new row, so the status check happens on
 * the payload: the common updates (queued to generating at dispatch) are
 * dropped without a round trip, and only a settled row costs a fetch. The
 * fetch still goes through `readDraftState` rather than trusting the payload,
 * because the render link the thread needs has to be one this server signed,
 * and because a payload from a socket is not a row that was necessarily
 * committed the way it arrived. The realtime config in the private client is
 * left off, because the whole point of the socket is that it stays open.
 */

/** The subset of a generation row change this hook reacts to. */
interface GenerationChange {
  readonly id: string;
  readonly status: string;
}

const SETTLED_STATUSES = new Set(["ready", "failed"]);

/**
 * Watches the account's generation rows and reports the ones that settle.
 *
 * `onSettled` is the thread's own draft writer, so a push and a poll landing
 * for the same generation is a no-op the second time. `cancelled` is dropped
 * rather than shown: `cancelGeneration` settles the row and the thread already
 * removed the draft that produced it, on purpose.
 */
export function useGenerationRealtime(
  onSettled: (generationId: string) => void,
): void {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    const channel = supabase
      .channel("generation-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "video_generations",
        },
        (event: { new: Partial<GenerationChange> }) => {
          const next = event.new;
          if (typeof next.id !== "string" || typeof next.status !== "string") return;
          if (!SETTLED_STATUSES.has(next.status)) return;
          onSettled(next.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onSettled]);
}
