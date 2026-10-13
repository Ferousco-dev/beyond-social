"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { startAvatarVideo } from "@/features/live-avatar/avatar-video-actions";

import { adoptVideo, sceneStatus } from "../assist-actions";
import { makeId } from "../lib/format";
import { placeGeneratedVideo } from "../lib/place-generated";

const POLL_MS = 4000;
const TIMEOUT_MS = 10 * 60 * 1000;
const WORDS_PER_SECOND = 2.5;

export type AvatarVideoState =
  | { readonly phase: "idle" }
  | { readonly phase: "working" }
  | { readonly phase: "done" }
  | { readonly phase: "failed"; readonly message: string };

/** Speaking time when the provider does not report a length. */
function estimateSeconds(script: string): number {
  const words = script.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / WORDS_PER_SECOND));
}

interface AvatarVideo {
  state: AvatarVideoState;
  make: (avatarId: string, script: string) => Promise<void>;
  reset: () => void;
}

/** Makes an avatar speak a script and adds the finished video to the timeline. */
export function useAvatarVideo(): AvatarVideo {
  const [state, setState] = useState<AvatarVideoState>({ phase: "idle" });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const make = useCallback(async (avatarId: string, script: string): Promise<void> => {
    setState({ phase: "working" });
    const started = await startAvatarVideo({ avatarId, script, idempotencyKey: `editor-${makeId()}-${makeId()}` });
    if (started.status !== "ok") return setState({ phase: "failed", message: started.status === "error" ? started.message : "Avatars are not available right now." });

    const deadline = Date.now() + TIMEOUT_MS;
    while (alive.current && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      const status = await sceneStatus(started.job.id);
      if (status.state === "failed") return setState({ phase: "failed", message: status.message });
      if (status.state !== "done") continue;
      // The provider's link expires, so the video is copied into the user's storage first.
      const copied = await adoptVideo(started.job.id);
      if (!copied.ok) return setState({ phase: "failed", message: copied.message });
      const placed = placeGeneratedVideo(copied.mediaId, status.seconds ?? estimateSeconds(script), "Avatar video");
      return setState(placed.error ? { phase: "failed", message: placed.error } : { phase: "done" });
    }
    if (alive.current) setState({ phase: "failed", message: "This is taking longer than expected. It will appear in your Library when it finishes." });
  }, []);

  return { state, make, reset: useCallback(() => setState({ phase: "idle" }), []) };
}
